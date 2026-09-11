# Affiliate Non-MLM Technical Specification

> สร้างโดย: blockchain-web3 + legal-compliance | วันที่: 8 กันยายน 2569 | Wave 5 งาน 5.5

---

## หลักการบังคับ (ไม่สามารถเปลี่ยนได้)

ตาม CLAUDE.md Standing Orders ข้อ 5:
1. **จ่ายจากยอดขายจริงเท่านั้น** — ห้ามจ่ายจากค่าสมัคร/ค่าสต็อก/ค่าฝึกอบรม
2. **ลึกไม่เกิน 2 ชั้น** — ชั้น 1: ผู้แนะนำโดยตรง, ชั้น 2: ผู้แนะนำของผู้แนะนำ
3. **ไม่มีเป้าขาย** — ไม่บังคับซื้อเพื่อคง status
4. **ตรวจสอบได้ทุก transaction** — audit log ครบทุกการจ่ายเงิน

---

## โครงสร้างค่าคอม

> ⚠️ ตัวเลข % ด้านล่างเป็น **placeholder รอ Mythos กำหนด** — ห้าม hardcode ก่อนได้รับอนุมัติ

```
ยอดขายสุทธิ = ราคาสินค้า - VAT - ค่า refund - ค่า platform fee

ชั้น 1 (direct referral):  [X%] ของยอดขายสุทธิ  ← รอ Mythos กำหนด
ชั้น 2 (indirect referral): [Y%] ของยอดขายสุทธิ  ← รอ Mythos กำหนด

เงื่อนไขจ่าย:
- มีธุรกรรมขายจริงเกิดขึ้น (ไม่ใช่แค่ signup)
- ผ่าน cooldown 30 วัน (ป้องกัน fraud refund)
- ยอดขั้นต่ำก่อนเบิก: [Z บาท] ← รอ Mythos กำหนด
```

---

## Database Schema (PostgreSQL)

```sql
-- ตาราง affiliate ลงทะเบียน
CREATE TABLE affiliates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id),
    referrer_id   UUID REFERENCES affiliates(id),  -- NULL = root level
    depth         SMALLINT NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- enforce max 2 levels deep
    CONSTRAINT max_depth CHECK (depth <= 2),
    -- prevent self-referral
    CONSTRAINT no_self_referral CHECK (id != referrer_id),
    -- prevent circular referral (enforced by trigger)
    UNIQUE (user_id)
);

-- ตาราง referral link
CREATE TABLE referrals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id  UUID NOT NULL REFERENCES affiliates(id),
    referred_user UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (referred_user)  -- แต่ละคน referred โดยคนเดียวเท่านั้น
);

-- ตาราง commission (คำนวณต่อธุรกรรม)
CREATE TABLE commissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    affiliate_id    UUID NOT NULL REFERENCES affiliates(id),
    level           SMALLINT NOT NULL CHECK (level IN (1, 2)),
    gross_amount    NUMERIC(12,2) NOT NULL,   -- ราคาขาย
    net_amount      NUMERIC(12,2) NOT NULL,   -- หลังหัก VAT, fee, refund
    rate_pct        NUMERIC(5,4) NOT NULL,    -- % ที่ใช้คำนวณ (snapshot ณ เวลาขาย)
    commission_amt  NUMERIC(12,2) NOT NULL,   -- net_amount * rate_pct
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    eligible_at     TIMESTAMPTZ,             -- วันที่ cooldown ผ่าน
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- บันทึก rate ณ เวลาขาย (ไม่เปลี่ยนย้อนหลัง)
    CONSTRAINT positive_commission CHECK (commission_amt >= 0)
);

-- Audit log ทุก state change
CREATE TABLE commission_audit_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_id  UUID NOT NULL REFERENCES commissions(id),
    old_status     VARCHAR(20),
    new_status     VARCHAR(20) NOT NULL,
    changed_by     UUID REFERENCES users(id),
    reason         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index สำคัญ
CREATE INDEX idx_affiliates_referrer ON affiliates(referrer_id);
CREATE INDEX idx_commissions_affiliate ON commissions(affiliate_id, status);
CREATE INDEX idx_commissions_eligible ON commissions(eligible_at) WHERE status = 'pending';
```

---

## Business Logic (TypeScript pseudocode)

```typescript
// คำนวณ commission สำหรับ transaction หนึ่งรายการ
async function calculateCommissions(transactionId: string): Promise<void> {
  const tx = await getTransaction(transactionId);
  const buyer = await getUser(tx.userId);
  const referral = await getReferral(buyer.id);
  
  if (!referral) return; // ไม่มีคนแนะนำ ไม่มี commission
  
  const netAmount = tx.amount - tx.vat - tx.platformFee - tx.refundAmount;
  if (netAmount <= 0) return; // ยอดสุทธิ <= 0 ไม่จ่าย
  
  const rates = await getCommissionRates(); // snapshot ณ เวลานี้
  const eligibleAt = new Date(tx.createdAt);
  eligibleAt.setDate(eligibleAt.getDate() + 30); // cooldown 30 วัน
  
  // ชั้น 1: ผู้แนะนำโดยตรง
  const level1Affiliate = await getAffiliate(referral.affiliateId);
  await createCommission({
    transactionId,
    affiliateId: level1Affiliate.id,
    level: 1,
    netAmount,
    ratePct: rates.level1,
    commissionAmt: netAmount * rates.level1,
    eligibleAt,
  });
  
  // ชั้น 2: ผู้แนะนำของผู้แนะนำ (ถ้ามี)
  if (level1Affiliate.referrerId) {
    const level2Affiliate = await getAffiliate(level1Affiliate.referrerId);
    // ตรวจสอบว่า level2 ไม่ใช่คนเดียวกับ level1
    if (level2Affiliate.id !== level1Affiliate.id) {
      await createCommission({
        transactionId,
        affiliateId: level2Affiliate.id,
        level: 2,
        netAmount,
        ratePct: rates.level2,
        commissionAmt: netAmount * rates.level2,
        eligibleAt,
      });
    }
  }
  // ไม่มีชั้น 3+ — enforce โดย schema (depth <= 2)
}
```

---

## Legal Compliance Checklist (พ.ร.บ. ขายตรง พ.ศ. 2545)

| ข้อ | กำหนด | สถานะ OpenThaiAi |
|---|---|---|
| 1 | จ่ายค่าตอบแทนจากยอดขายจริงเท่านั้น | ✅ enforce โดย schema |
| 2 | ห้ามเก็บค่าสมัคร | ✅ ไม่มี registration fee |
| 3 | ห้ามบังคับซื้อสต็อก | ✅ ไม่มีระบบสต็อก |
| 4 | มีระบบคืนสินค้า | 🟡 ต้องกำหนด refund policy |
| 5 | แสดงข้อมูลค่าตอบแทนชัดเจน | 🟡 ต้องเพิ่มหน้า disclosure |
| 6 | จดทะเบียนกับ กรมพัฒนาธุรกิจการค้า | 🔴 รอนิติบุคคล + Mythos |

**เอกสารที่ต้องยื่น กรมพัฒนาธุรกิจการค้า:**
- แผนผังโครงสร้างค่าตอบแทน
- ตัวอย่างสัญญาผู้แนะนำ
- หลักฐานนิติบุคคล (รอ Mythos ตั้งบริษัท)

---

## Anti-fraud Rules

```typescript
// ป้องกัน fraud ก่อน record commission
async function fraudCheck(transactionId: string, affiliateId: string): Promise<boolean> {
  // 1. ป้องกัน self-referral
  const tx = await getTransaction(transactionId);
  const affiliate = await getAffiliate(affiliateId);
  if (tx.userId === affiliate.userId) return false; // fail

  // 2. ตรวจ velocity: affiliate เดียวกันมากกว่า N transactions/วัน
  const dailyCount = await getDailyTransactionCount(affiliateId);
  if (dailyCount > DAILY_FRAUD_THRESHOLD) {
    await flagForReview(affiliateId, 'velocity_exceeded');
    return false;
  }

  // 3. ตรวจ pattern: user สมัครแล้วซื้อทันทีและ refund ภายใน 7 วัน
  const refundPattern = await checkRefundPattern(tx.userId);
  if (refundPattern.isAbnormal) {
    await flagForReview(affiliateId, 'refund_pattern');
    return false;
  }

  return true;
}
```

---

## Smart Contract Option (Optional — ถ้าใช้ Blockchain)

**ข้อดี On-chain Commission:**
- โปร่งใส 100% ตรวจสอบได้ทุกคน
- จ่ายอัตโนมัติไม่ต้องรอ manual approval
- ลดความเสี่ยง trust ระหว่าง platform กับ affiliate

**ข้อเสีย:**
- ต้องการ Token/Coin ที่ถูกกฎหมายตาม พ.ร.บ. สินทรัพย์ดิจิทัล พ.ศ. 2561
- Gas fee อาจแพงกว่าค่า commission สำหรับ micro-transaction
- ต้องขออนุญาต ก.ล.ต. ก่อน (อาจใช้เวลา 6–12 เดือน)

**คำแนะนำ (ประมาณการ):** เริ่มด้วย off-chain (PostgreSQL) ก่อน เมื่อโครงการมีรายได้จริงและนิติบุคคลพร้อม จึงพิจารณา on-chain สำหรับ tier affiliate ระดับสูง

---

*เสิร์ฟกลุ่มผู้ใช้: กลุ่มที่ 3 (แพลตฟอร์ม) — Affiliate Hub*
*สิ่งที่ยังไม่ได้ทำ: กำหนด % จริง (รอ Mythos), จดทะเบียน กรมพัฒนาธุรกิจการค้า, refund policy, ทดสอบ fraud detection*
