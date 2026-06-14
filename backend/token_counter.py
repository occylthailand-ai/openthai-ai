"""
OpenThai AI — Session Token Counter
นับ token ที่ใช้จริงจาก Claude API response ทุก call
- บันทึกลง DB (TokenUsage table)
- รายงาน daily/monthly cost
- แจ้งเตือนเมื่อใกล้ budget
"""

import os
import logging
from datetime import datetime, date
from typing import Optional

logger = logging.getLogger("openthai.tokens")

# Claude Sonnet 4.6 pricing (USD per 1M tokens)
PRICE_INPUT  = 3.0    # $3.00 / 1M input tokens
PRICE_OUTPUT = 15.0   # $15.00 / 1M output tokens

BUDGET_ALERT_USD = float(os.getenv("TOKEN_BUDGET_ALERT_USD", "10.0"))  # alert ที่ $10/วัน


def tokens_to_usd(input_tokens: int, output_tokens: int) -> float:
    return (input_tokens * PRICE_INPUT + output_tokens * PRICE_OUTPUT) / 1_000_000


async def record_usage(
    call_type: str,          # "generate", "critic", "mythos", "goal_health", "news_summary"
    input_tokens: int,
    output_tokens: int,
    model: str = "claude-sonnet-4-6",
    user_id: Optional[int] = None,
    metadata: Optional[str] = None,
) -> dict:
    """บันทึก token usage ลง DB"""
    cost_usd = tokens_to_usd(input_tokens, output_tokens)
    try:
        from db import AsyncSessionLocal, TokenUsage
        async with AsyncSessionLocal() as db:
            row = TokenUsage(
                call_type=call_type,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
                cost_usd=cost_usd,
                user_id=user_id,
                metadata=metadata or "",
                created_at=datetime.utcnow(),
            )
            db.add(row)
            await db.commit()
    except Exception as e:
        logger.warning("record_usage failed (non-fatal): %s", e)

    return {
        "call_type": call_type,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "cost_usd": round(cost_usd, 6),
    }


async def get_daily_summary(target_date: Optional[str] = None) -> dict:
    """สรุป token usage วันนี้"""
    from db import AsyncSessionLocal, TokenUsage
    from sqlalchemy import select, func
    d = target_date or str(date.today())
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(
                func.sum(TokenUsage.input_tokens),
                func.sum(TokenUsage.output_tokens),
                func.sum(TokenUsage.total_tokens),
                func.sum(TokenUsage.cost_usd),
                func.count(TokenUsage.id),
            ).where(func.date(TokenUsage.created_at) == d)
        )
        row = res.one()
        input_t, output_t, total_t, cost, calls = row

        # breakdown by call_type
        breakdown_res = await db.execute(
            select(TokenUsage.call_type, func.sum(TokenUsage.total_tokens), func.sum(TokenUsage.cost_usd))
            .where(func.date(TokenUsage.created_at) == d)
            .group_by(TokenUsage.call_type)
        )
        breakdown = [
            {"call_type": r[0], "tokens": int(r[1] or 0), "cost_usd": round(float(r[2] or 0), 4)}
            for r in breakdown_res.all()
        ]

    return {
        "date": d,
        "calls": int(calls or 0),
        "input_tokens": int(input_t or 0),
        "output_tokens": int(output_t or 0),
        "total_tokens": int(total_t or 0),
        "cost_usd": round(float(cost or 0), 4),
        "breakdown": sorted(breakdown, key=lambda x: -x["tokens"]),
        "budget_alert_usd": BUDGET_ALERT_USD,
        "over_budget": float(cost or 0) >= BUDGET_ALERT_USD,
    }


async def get_monthly_summary(year: int, month: int) -> dict:
    """สรุป token usage รายเดือน"""
    from db import AsyncSessionLocal, TokenUsage
    from sqlalchemy import select, func, extract
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(
                func.sum(TokenUsage.input_tokens),
                func.sum(TokenUsage.output_tokens),
                func.sum(TokenUsage.total_tokens),
                func.sum(TokenUsage.cost_usd),
                func.count(TokenUsage.id),
            ).where(
                extract("year", TokenUsage.created_at) == year,
                extract("month", TokenUsage.created_at) == month,
            )
        )
        row = res.one()
        input_t, output_t, total_t, cost, calls = row

        # daily breakdown
        daily_res = await db.execute(
            select(func.date(TokenUsage.created_at), func.sum(TokenUsage.total_tokens), func.sum(TokenUsage.cost_usd))
            .where(
                extract("year", TokenUsage.created_at) == year,
                extract("month", TokenUsage.created_at) == month,
            )
            .group_by(func.date(TokenUsage.created_at))
            .order_by(func.date(TokenUsage.created_at))
        )
        daily = [
            {"date": str(r[0]), "tokens": int(r[1] or 0), "cost_usd": round(float(r[2] or 0), 4)}
            for r in daily_res.all()
        ]

    return {
        "year": year, "month": month,
        "calls": int(calls or 0),
        "input_tokens": int(input_t or 0),
        "output_tokens": int(output_t or 0),
        "total_tokens": int(total_t or 0),
        "cost_usd": round(float(cost or 0), 4),
        "daily": daily,
    }


async def check_budget_alert() -> None:
    """แจ้ง LINE CEO ถ้า cost วันนี้เกิน budget"""
    summary = await get_daily_summary()
    if not summary["over_budget"]:
        return
    token = os.getenv("LINE_MYTHOS_CEO", os.getenv("LINE_NOTIFY_TOKEN", ""))
    if not token:
        return
    import httpx
    msg = (
        f"\n⚠️ TOKEN BUDGET ALERT"
        f"\n{'━'*20}"
        f"\n📅 {summary['date']}"
        f"\n💸 Cost: ${summary['cost_usd']:.4f} / ${BUDGET_ALERT_USD:.2f} budget"
        f"\n🔢 Total tokens: {summary['total_tokens']:,}"
        f"\n📞 API calls: {summary['calls']}"
        f"\n\nTop usage:"
        + "".join(f"\n  • {b['call_type']}: {b['tokens']:,} tokens (${b['cost_usd']:.4f})"
                  for b in summary["breakdown"][:5])
    )
    try:
        async with httpx.AsyncClient() as c:
            await c.post(
                "https://notify-api.line.me/api/notify",
                headers={"Authorization": f"Bearer {token}"},
                data={"message": msg},
                timeout=10,
            )
    except Exception:
        pass
