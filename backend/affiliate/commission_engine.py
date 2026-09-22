"""
OpenThai.ai — Affiliate Commission Engine (Wave 8, Task 8.6)
commission_engine.py

Non-MLM 2-tier commission logic ตาม docs/affiliate-legal-check.md

กฎบังคับ (CLAUDE.md ข้อ 5):
  - จ่าย commission จากยอดขายจริงเท่านั้น
  - ลึกสูงสุด 2 ชั้น
  - ชั้น 1: ≤ 15% | ชั้น 2: ≤ 5%
  - ทุก transaction ต้องมี audit trail

เสิร์ฟกลุ่มผู้ใช้: กลุ่ม 2 คนกลาง + กลุ่ม 3 แพลตฟอร์ม
สร้าง: 2026-09-14 | Wave 8
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


# =============================================================================
# Constants
# =============================================================================

MAX_CHAIN_DEPTH = 2
TIER1_MAX_PCT = 0.15
TIER2_MAX_PCT = 0.05


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class CommissionTransaction:
    sale_id: str
    sale_amount: float          # ยอดขายจริง (บาท) — ห้ามติดลบ
    referral_chain: list[str]   # [tier1_id, tier2_id] — สูงสุด 2 รายการ
    tier1_pct: float = TIER1_MAX_PCT
    tier2_pct: float = TIER2_MAX_PCT
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    tx_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_refund: bool = False


@dataclass
class CommissionResult:
    tx_id: str
    sale_id: str
    sale_amount: float
    tier1_id: Optional[str]
    tier1_amount: float
    tier2_id: Optional[str]
    tier2_amount: float
    total_commission: float
    audit_log: list[str]        # immutable audit trail


@dataclass
class Payout:
    payout_id: str
    affiliate_id: str
    amount: float
    period: str                  # "2026-09" (YYYY-MM)
    status: str = "pending"      # pending | processing | paid | cancelled
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# =============================================================================
# CommissionEngine
# =============================================================================

class CommissionEngine:
    """
    คำนวณและบันทึก affiliate commission แบบ Non-MLM 2 ชั้น

    ใช้ in-memory store (dict) สำหรับ stub — production ต้องเปลี่ยนเป็น DB
    """

    def __init__(
        self,
        tier1_pct: float = TIER1_MAX_PCT,
        tier2_pct: float = TIER2_MAX_PCT,
    ) -> None:
        if tier1_pct > TIER1_MAX_PCT:
            raise ValueError(f"tier1_pct ต้องไม่เกิน {TIER1_MAX_PCT:.0%}")
        if tier2_pct > TIER2_MAX_PCT:
            raise ValueError(f"tier2_pct ต้องไม่เกิน {TIER2_MAX_PCT:.0%}")
        self.tier1_pct = tier1_pct
        self.tier2_pct = tier2_pct

        # in-memory stores
        self._transactions: dict[str, CommissionResult] = {}
        self._payouts: dict[str, Payout] = {}
        # affiliate_id → list of tx_ids
        self._affiliate_txs: dict[str, list[str]] = {}

    # ── Validation ────────────────────────────────────────────────────────────

    def validate_chain_depth(self, chain: list[str]) -> bool:
        """ต้องมีสมาชิกไม่เกิน MAX_CHAIN_DEPTH (2) รายการ"""
        return 0 < len(chain) <= MAX_CHAIN_DEPTH

    # ── Core: calculate ──────────────────────────────────────────────────────

    def calculate(
        self,
        sale_amount: float,
        referral_chain: list[str],
    ) -> CommissionResult:
        """
        คำนวณ commission จาก sale_amount และ referral_chain

        Args:
            sale_amount:    ยอดขายจริง (บาท) — ต้องไม่ติดลบ
            referral_chain: [tier1_affiliate_id, tier2_affiliate_id]
                            ต้องมีอย่างน้อย 1 รายการ สูงสุด 2 รายการ

        Returns:
            CommissionResult พร้อม audit_log

        Raises:
            ValueError: sale_amount ติดลบ หรือ chain ลึกเกิน 2
        """
        audit: list[str] = []
        now_str = datetime.now(timezone.utc).isoformat()

        if sale_amount < 0:
            raise ValueError("sale_amount ต้องไม่ติดลบ")
        if sale_amount == 0:
            audit.append(f"[{now_str}] sale_amount=0 → commission=0 (refund or zero-value sale)")

        if not self.validate_chain_depth(referral_chain):
            raise ValueError(
                f"referral_chain ลึก {len(referral_chain)} ชั้น — "
                f"ระบบรองรับสูงสุด {MAX_CHAIN_DEPTH} ชั้นเท่านั้น (Non-MLM rule)"
            )

        tx_id = str(uuid.uuid4())
        tier1_id = referral_chain[0] if len(referral_chain) >= 1 else None
        tier2_id = referral_chain[1] if len(referral_chain) >= 2 else None

        tier1_amount = round(sale_amount * self.tier1_pct, 2) if tier1_id else 0.0
        tier2_amount = round(sale_amount * self.tier2_pct, 2) if tier2_id else 0.0
        total = round(tier1_amount + tier2_amount, 2)

        audit.append(f"[{now_str}] tx_id={tx_id}")
        audit.append(f"  sale_amount={sale_amount:.2f} บาท")
        if tier1_id:
            audit.append(f"  tier1: {tier1_id} × {self.tier1_pct:.0%} = {tier1_amount:.2f} บาท")
        if tier2_id:
            audit.append(f"  tier2: {tier2_id} × {self.tier2_pct:.0%} = {tier2_amount:.2f} บาท")
        audit.append(f"  total_commission={total:.2f} บาท")

        result = CommissionResult(
            tx_id=tx_id,
            sale_id="",  # caller sets this
            sale_amount=sale_amount,
            tier1_id=tier1_id,
            tier1_amount=tier1_amount,
            tier2_id=tier2_id,
            tier2_amount=tier2_amount,
            total_commission=total,
            audit_log=audit,
        )
        return result

    # ── record_transaction ────────────────────────────────────────────────────

    def record_transaction(self, tx: CommissionTransaction) -> str:
        """
        บันทึก transaction ลง in-memory store พร้อม audit

        Returns:
            tx_id (str)
        """
        result = self.calculate(tx.sale_amount, tx.referral_chain)
        result.sale_id = tx.sale_id
        result.tx_id = tx.tx_id

        if tx.is_refund:
            # reverse amounts for refund
            result.tier1_amount = -abs(result.tier1_amount)
            result.tier2_amount = -abs(result.tier2_amount)
            result.total_commission = -abs(result.total_commission)
            result.audit_log.append(f"  [REFUND] amounts reversed for sale_id={tx.sale_id}")

        self._transactions[tx.tx_id] = result

        for affiliate_id in filter(None, [result.tier1_id, result.tier2_id]):
            self._affiliate_txs.setdefault(affiliate_id, []).append(tx.tx_id)

        return tx.tx_id

    # ── get_pending_payouts ───────────────────────────────────────────────────

    def get_pending_payouts(self, affiliate_id: str) -> list[Payout]:
        """รวม commission ที่ยังไม่ได้จ่ายของ affiliate นี้ตามรอบเดือน"""
        tx_ids = self._affiliate_txs.get(affiliate_id, [])
        if not tx_ids:
            return []

        # group by period (YYYY-MM)
        by_period: dict[str, float] = {}
        for tx_id in tx_ids:
            result = self._transactions[tx_id]
            period = result.audit_log[0][1:8]  # extract date part YYYY-MM
            if not period or len(period) < 7:
                period = datetime.now(timezone.utc).strftime("%Y-%m")
            amount = (
                result.tier1_amount if result.tier1_id == affiliate_id
                else result.tier2_amount
            )
            by_period[period] = by_period.get(period, 0.0) + amount

        payouts = []
        for period, amount in by_period.items():
            if amount > 0:
                payout_id = str(uuid.uuid4())
                p = Payout(
                    payout_id=payout_id,
                    affiliate_id=affiliate_id,
                    amount=round(amount, 2),
                    period=period,
                )
                self._payouts[payout_id] = p
                payouts.append(p)
        return payouts

    def mark_paid(self, payout_ids: list[str]) -> int:
        """อัปเดตสถานะ payout เป็น 'paid' — return จำนวนที่อัปเดตสำเร็จ"""
        count = 0
        for pid in payout_ids:
            if pid in self._payouts:
                self._payouts[pid].status = "paid"
                count += 1
        return count


# =============================================================================
# Quick self-test (5 cases)
# =============================================================================

if __name__ == "__main__":
    engine = CommissionEngine()

    print("=== Test 1: 1 ชั้น (tier1 เท่านั้น) ===")
    r1 = engine.calculate(1000.0, ["affiliate_A"])
    assert r1.tier1_amount == 150.0, r1
    assert r1.tier2_amount == 0.0, r1
    print(f"  tier1={r1.tier1_amount} บาท ✅")

    print("=== Test 2: 2 ชั้น ===")
    r2 = engine.calculate(1000.0, ["affiliate_A", "affiliate_B"])
    assert r2.tier1_amount == 150.0
    assert r2.tier2_amount == 50.0
    assert r2.total_commission == 200.0
    print(f"  tier1={r2.tier1_amount} tier2={r2.tier2_amount} total={r2.total_commission} ✅")

    print("=== Test 3: เกิน 2 ชั้น → ต้อง raise ===")
    try:
        engine.calculate(1000.0, ["A", "B", "C"])
        print("  ❌ ควร raise ValueError")
    except ValueError as e:
        print(f"  ✅ ได้ ValueError: {e}")

    print("=== Test 4: ยอดขาย 0 ===")
    r4 = engine.calculate(0.0, ["affiliate_A"])
    assert r4.total_commission == 0.0
    print(f"  commission={r4.total_commission} ✅")

    print("=== Test 5: Refund ===")
    from datetime import timezone
    tx = CommissionTransaction(
        sale_id="SALE-999",
        sale_amount=500.0,
        referral_chain=["affiliate_A"],
        is_refund=True,
    )
    tx_id = engine.record_transaction(tx)
    result = engine._transactions[tx_id]
    assert result.tier1_amount < 0, result
    print(f"  refund tier1={result.tier1_amount} บาท ✅")

    print("\nทุก test ผ่าน ✅")
