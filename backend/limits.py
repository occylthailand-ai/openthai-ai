"""
OpenThai AI — Centralized Limit Control System
สิทธิ์เต็ม 100% — ควบคุมลิมิตทุกประเภทจากที่เดียว

ลำดับความสำคัญ (สูง → ต่ำ):
  1. DB override (admin กำหนดผ่าน /admin/limits)
  2. Environment variable (Railway settings)
  3. Default ใน code

หมายเหตุ: -1 หรือ 0 = ไม่จำกัด (unlimited)
"""

import os
import logging
from typing import Any

logger = logging.getLogger("openthai.limits")

# ── Defaults — ค่า fallback หากไม่มี env / DB override ──────────────────────

_DEFAULTS: dict[str, Any] = {
    # Rate limits
    "free_ip_daily":         50,     # anonymous IP (เดิม 3)
    "plan_free_daily":       100,    # free plan users (เดิม 10)
    "plan_pro_daily":        2000,   # pro plan (เดิม 200)
    "plan_business_daily":   -1,     # unlimited
    "plan_enterprise_daily": -1,     # unlimited

    # Bulk generation
    "bulk_max_products":     50,     # จำนวน product สูงสุดต่อ batch (เดิมไม่มีเพดาน)
    "bulk_max_parallel":     10,     # parallel requests (เดิม 3)

    # Claude API
    "claude_max_tokens":     4000,   # generation (เดิม 2000)
    "claude_max_tokens_critic":    1000,  # critic loop (เดิม 1000)
    "claude_max_tokens_mythos":    4000,  # mythos command (เดิม 2000)
    "claude_max_tokens_goal":      1500,  # goal health analysis (เดิม 800)
    "claude_max_iterations":       5,     # quality loop (เดิม 3)

    # HTTP timeouts (seconds)
    "timeout_news_feed":     30,     # per RSS feed (เดิม 15)
    "timeout_line_notify":   15,     # LINE API calls (เดิม 8-10)
    "timeout_claude":        120,    # Claude API (เดิมไม่ได้ set)
    "timeout_payment":       20,     # payment endpoints (เดิม 10)

    # News monitor
    "news_fetch_interval_min":  30,  # ดึงข่าวทุกกี่นาที
    "news_max_items_per_feed":  20,  # items สูงสุดต่อ feed

    # Goal tracker
    "goal_check_interval_hr":   4,   # ตรวจ OKR ทุกกี่ชั่วโมง
    "goal_alert_cooldown_hr":   8,   # min ชั่วโมงระหว่าง alert ซ้ำ

    # Request body
    "max_product_name_len":      200,
    "max_description_len":       2000,
    "max_directive_len":         5000,
}

# ── Runtime override store (in-memory, loaded from DB on startup) ─────────────

_overrides: dict[str, Any] = {}


def _env_key(name: str) -> str:
    return f"LIMIT_{name.upper()}"


def get(name: str, default: Any = None) -> Any:
    """
    ดึงค่า limit ตามลำดับ: DB override → env var → _DEFAULTS → default arg
    """
    # 1. DB override (set via /admin/limits at runtime)
    if name in _overrides:
        return _overrides[name]

    # 2. Environment variable
    env_val = os.getenv(_env_key(name))
    if env_val is not None:
        try:
            v = int(env_val) if "." not in env_val else float(env_val)
            return v
        except ValueError:
            return env_val

    # 3. Code default
    if name in _DEFAULTS:
        return _DEFAULTS[name]

    return default


def set_override(name: str, value: Any) -> None:
    """Set runtime override (persists until server restart unless DB-backed)"""
    _overrides[name] = value
    logger.info("limit override: %s = %s", name, value)


def remove_override(name: str) -> None:
    _overrides.pop(name, None)


def all_limits() -> dict[str, dict]:
    """คืน snapshot ทุก limit พร้อม source"""
    result = {}
    for name, default in _DEFAULTS.items():
        if name in _overrides:
            result[name] = {"value": _overrides[name], "source": "runtime_override"}
        elif os.getenv(_env_key(name)) is not None:
            result[name] = {"value": get(name), "source": "env_var"}
        else:
            result[name] = {"value": default, "source": "default"}
    return result


async def load_db_overrides() -> None:
    """โหลด limit overrides จาก DB ตอน startup"""
    try:
        from db import AsyncSessionLocal, SystemConfig
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(SystemConfig).where(SystemConfig.key.like("limit.%"))
            )
            rows = res.scalars().all()
            for row in rows:
                limit_name = row.key[len("limit."):]
                try:
                    _overrides[limit_name] = int(row.value)
                except (ValueError, TypeError):
                    try:
                        _overrides[limit_name] = float(row.value)
                    except (ValueError, TypeError):
                        _overrides[limit_name] = row.value
            if rows:
                logger.info("Loaded %d limit overrides from DB", len(rows))
    except Exception as e:
        logger.debug("load_db_overrides: %s (ignored — DB may not have SystemConfig yet)", e)


async def save_db_override(name: str, value: Any) -> None:
    """บันทึก limit override เข้า DB (persist ข้าม restart)"""
    try:
        from db import AsyncSessionLocal, SystemConfig
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            key = f"limit.{name}"
            res = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
            row = res.scalar_one_or_none()
            if row:
                row.value = str(value)
            else:
                db.add(SystemConfig(key=key, value=str(value), description=f"Limit override: {name}"))
            await db.commit()
    except Exception as e:
        logger.warning("save_db_override failed: %s", e)


# ── Convenience shortcuts ────────────────────────────────────────────────────

def plan_daily_limit(plan: str) -> int:
    mapping = {
        "free":       "plan_free_daily",
        "pro":        "plan_pro_daily",
        "business":   "plan_business_daily",
        "enterprise": "plan_enterprise_daily",
    }
    key = mapping.get(plan, "plan_free_daily")
    return get(key, 100)


def is_unlimited(plan: str) -> bool:
    return plan_daily_limit(plan) == -1
