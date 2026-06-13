"""
API Key authentication + per-plan rate limiting
- Header: X-API-Key: otai_<token>
- Admin key (env ADMIN_API_KEY) bypasses all limits
- Rate limits: free=10/day, pro=200/day, business=unlimited
"""

from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date as date_type
from db import get_db, User, ApiUsage, Organization, OrgMember
import os

_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

ADMIN_KEY: str = os.getenv("ADMIN_API_KEY", "")

import limits as _limits

PLAN_LIMITS: dict[str, int] = {
    "free":       _limits.get("plan_free_daily", 100),
    "pro":        _limits.get("plan_pro_daily", 2000),
    "business":   _limits.get("plan_business_daily", -1),
    "enterprise": _limits.get("plan_enterprise_daily", -1),
}

def _get_plan_limit(plan: str) -> int:
    """Dynamic — reads from limits module (supports runtime override)"""
    return _limits.plan_daily_limit(plan)


def _admin_user() -> User:
    u = User()
    u.id = 0
    u.email = "admin@openthai.ai"
    u.name = "Admin"
    u.plan = "business"
    u.org_id = ""
    u.is_active = True
    return u


async def require_api_key(
    key: str = Security(_KEY_HEADER),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not key:
        raise HTTPException(
            status_code=401,
            detail="ต้องใส่ X-API-Key header. สมัครรับ API key ได้ที่ POST /auth/register",
        )

    if ADMIN_KEY and key == ADMIN_KEY:
        return _admin_user()

    result = await db.execute(select(User).where(User.api_key == key))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="API key ไม่ถูกต้อง")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="API key ถูกระงับ กรุณาติดต่อ support")

    limit = _get_plan_limit(user.plan)
    if limit > 0:
        today = str(date_type.today())
        res = await db.execute(
            select(ApiUsage).where(ApiUsage.api_key == key, ApiUsage.date == today)
        )
        usage = res.scalar_one_or_none()
        used = usage.count if usage else 0
        if used >= limit:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"ใช้ครบ {limit} ครั้งแล้ววันนี้ (แผน {user.plan}). "
                    f"อัปเกรดได้ที่ https://openthai-ai.vercel.app"
                ),
                headers={"X-RateLimit-Limit": str(limit), "X-RateLimit-Remaining": "0"},
            )

    return user


async def track_usage(key: str, db: AsyncSession, count: int = 1) -> int:
    """Increment daily counter. Returns new total for today."""
    today = str(date_type.today())
    res = await db.execute(
        select(ApiUsage).where(ApiUsage.api_key == key, ApiUsage.date == today)
    )
    row = res.scalar_one_or_none()
    if row:
        row.count += count
        new_total = row.count
    else:
        db.add(ApiUsage(api_key=key, date=today, count=count))
        new_total = count
    await db.commit()
    return new_total


async def require_org_access(
    org_id: str,
    key: str,
    db: AsyncSession,
    check_quota: bool = False,
) -> Organization:
    """
    Org master key OR any org member's individual user key.
    check_quota=True → ตรวจ daily_limit ก่อน return
    """
    if not key:
        raise HTTPException(status_code=401, detail="ต้องใส่ X-API-Key header")

    # Admin bypass
    if ADMIN_KEY and key == ADMIN_KEY:
        res = await db.execute(select(Organization).where(Organization.org_id == org_id))
        org = res.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=404, detail=f"ไม่พบองค์กร {org_id}")
        return org

    # Try org master key
    org_res = await db.execute(
        select(Organization).where(
            Organization.org_id == org_id,
            Organization.api_key == key,
            Organization.is_active == True,
        )
    )
    org = org_res.scalar_one_or_none()

    # Try individual user key if master key didn't match
    if not org:
        user_res = await db.execute(
            select(User).where(User.api_key == key, User.is_active == True)
        )
        user = user_res.scalar_one_or_none()
        if user:
            member_res = await db.execute(
                select(OrgMember).where(
                    OrgMember.org_id == org_id, OrgMember.user_id == user.id
                )
            )
            if member_res.scalar_one_or_none():
                org_res2 = await db.execute(
                    select(Organization).where(
                        Organization.org_id == org_id, Organization.is_active == True
                    )
                )
                org = org_res2.scalar_one_or_none()

    if not org:
        raise HTTPException(status_code=403, detail="API key ไม่มีสิทธิ์เข้าถึงองค์กรนี้")

    if check_quota and org.daily_limit > 0:
        today = str(date_type.today())
        usage_res = await db.execute(
            select(ApiUsage).where(ApiUsage.api_key == org.api_key, ApiUsage.date == today)
        )
        usage = usage_res.scalar_one_or_none()
        used = usage.count if usage else 0
        if used >= org.daily_limit:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"องค์กร '{org.name}' ใช้ครบ {org.daily_limit} ครั้งแล้ววันนี้ "
                    f"อัปเกรด plan เพื่อเพิ่มโควต้า"
                ),
                headers={
                    "X-RateLimit-Limit":     str(org.daily_limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

    return org


async def require_org_admin(org_id: str, key: str, db: AsyncSession) -> Organization:
    """
    Org master key OR individual user with role='admin' in this org.
    ใช้สำหรับ write operations เช่น invite, bulk-generate
    """
    if not key:
        raise HTTPException(status_code=401, detail="ต้องใส่ X-API-Key header")

    # Admin bypass
    if ADMIN_KEY and key == ADMIN_KEY:
        res = await db.execute(select(Organization).where(Organization.org_id == org_id))
        org = res.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=404, detail=f"ไม่พบองค์กร {org_id}")
        return org

    # Org master key = implicit admin
    org_res = await db.execute(
        select(Organization).where(
            Organization.org_id == org_id,
            Organization.api_key == key,
            Organization.is_active == True,
        )
    )
    org = org_res.scalar_one_or_none()
    if org:
        return org

    # Individual key with role=admin
    user_res = await db.execute(
        select(User).where(User.api_key == key, User.is_active == True)
    )
    user = user_res.scalar_one_or_none()
    if user:
        member_res = await db.execute(
            select(OrgMember).where(
                OrgMember.org_id == org_id,
                OrgMember.user_id == user.id,
                OrgMember.role == "admin",
            )
        )
        if member_res.scalar_one_or_none():
            org_res2 = await db.execute(
                select(Organization).where(
                    Organization.org_id == org_id, Organization.is_active == True
                )
            )
            result = org_res2.scalar_one_or_none()
            if result:
                return result

    raise HTTPException(status_code=403, detail="ต้องเป็น admin ขององค์กรเท่านั้น")


async def require_admin(key: str = Security(_KEY_HEADER)) -> str:
    if not ADMIN_KEY or key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")
    return key
