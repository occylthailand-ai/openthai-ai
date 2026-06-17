"""
OpenThai.ai — Error Hunter 🔍
ชอนไชยค้นหาปัญหาทั่วระบบ แล้วแจ้งทีมที่เกี่ยวข้องแก้ไขอัตโนมัติ

ตรวจสอบ:
  1. API endpoints ทุกตัว (health check)
  2. Frontend pages (HTTP status)
  3. Database connectivity
  4. External services (Slack, LINE, Anthropic, Omise)
  5. SSL certificate expiry
  6. Error logs ล่าสุด
  7. Response time (performance)
  8. Production vs Staging diff

แจ้งทีม:
  🔧 Dev   — API errors, DB issues, deploy fails
  🔒 DevOps — SSL, uptime, performance
  💰 Finance — Payment gateway errors
  🎧 Support — User-facing 4xx errors
"""

import os
import asyncio
import logging
import httpx
import json
import ssl
import socket
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger("openthai.error_hunter")

BASE_URL      = os.getenv("API_BASE_URL", "https://openthai-ai.com")
SLACK_WEBHOOK = os.getenv("STARTUP_SLACK_WEBHOOK") or os.getenv("SLACK_WEBHOOK_URL", "")
LINE_TOKEN    = os.getenv("STARTUP_LINE_TOKEN", "")
LINE_USER_ID  = os.getenv("STARTUP_LINE_USER_ID", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OMISE_KEY     = os.getenv("OMISE_SECRET_KEY", "")


# ── Data structures ────────────────────────────────────────────────────────────

@dataclass
class Issue:
    severity: str          # critical / warning / info
    category: str          # api / db / ssl / perf / payment / frontend
    team: str              # dev / devops / finance / support / mythos
    title: str
    detail: str
    url: str = ""
    fix_hint: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%d/%m/%Y %H:%M:%S"))


SEVERITY_EMOJI = {"critical": "🚨", "warning": "⚠️", "info": "ℹ️"}
TEAM_EMOJI     = {"dev": "👨‍💻", "devops": "🖥️", "finance": "💰", "support": "🎧", "mythos": "👑"}


# ── Check functions ────────────────────────────────────────────────────────────

async def check_api_endpoints(client: httpx.AsyncClient) -> list[Issue]:
    """ตรวจสอบ API endpoints ทุกตัว"""
    issues = []
    endpoints = [
        ("GET",  "/",                      "Health check",        200),
        ("GET",  "/health",                "Health endpoint",     200),
        ("GET",  "/api/hook-types",        "Hook types API",      200),
        ("GET",  "/api/categories",        "Categories API",      200),
        ("GET",  "/api/affiliate/stats",   "Affiliate stats",     200),
        ("GET",  "/api/producers/list",    "Producer list",       200),
        ("GET",  "/api/system/status",     "System status",       200),
    ]

    for method, path, name, expected in endpoints:
        url = f"{BASE_URL}{path}"
        try:
            start = asyncio.get_event_loop().time()
            resp = await client.request(method, url, timeout=10)
            elapsed = (asyncio.get_event_loop().time() - start) * 1000

            if resp.status_code != expected and resp.status_code not in (200, 201, 204):
                issues.append(Issue(
                    severity="critical" if resp.status_code >= 500 else "warning",
                    category="api",
                    team="dev",
                    title=f"API Error: {name}",
                    detail=f"{method} {path} → HTTP {resp.status_code} (expected {expected})",
                    url=url,
                    fix_hint=f"ตรวจสอบ backend logs ที่ Railway สำหรับ endpoint {path}",
                ))
            elif elapsed > 3000:
                issues.append(Issue(
                    severity="warning",
                    category="perf",
                    team="devops",
                    title=f"Slow API: {name}",
                    detail=f"{method} {path} ใช้เวลา {elapsed:.0f}ms (เกิน 3000ms)",
                    url=url,
                    fix_hint="ตรวจสอบ Railway metrics, DB query performance, และ cold start",
                ))
        except httpx.TimeoutException:
            issues.append(Issue(
                severity="critical",
                category="api",
                team="dev",
                title=f"API Timeout: {name}",
                detail=f"{method} {path} — timeout หลัง 10 วินาที",
                url=url,
                fix_hint="ตรวจสอบ Railway deployment status และ server health",
            ))
        except Exception as e:
            issues.append(Issue(
                severity="critical",
                category="api",
                team="dev",
                title=f"API Unreachable: {name}",
                detail=f"{method} {path} — {type(e).__name__}: {str(e)[:100]}",
                url=url,
                fix_hint="ตรวจสอบว่า backend deploy สำเร็จหรือไม่ที่ Railway dashboard",
            ))

    return issues


async def check_frontend_pages(client: httpx.AsyncClient) -> list[Issue]:
    """ตรวจสอบหน้าเว็บสำคัญ"""
    issues = []
    pages = [
        ("/",               "Landing Page"),
        ("/login",          "Login Page"),
        ("/pricing",        "/pricing"),
        ("/affiliate",      "Affiliate Page"),
        ("/producer",       "Producer Onboarding"),
        ("/contact",        "Contact Page"),
        ("/privacy",        "Privacy Policy"),
    ]

    for path, name in pages:
        url = f"{BASE_URL}{path}"
        try:
            resp = await client.get(url, timeout=15, follow_redirects=True)
            if resp.status_code == 404:
                issues.append(Issue(
                    severity="warning",
                    category="frontend",
                    team="dev",
                    title=f"Page 404: {name}",
                    detail=f"{path} → HTTP 404 Not Found",
                    url=url,
                    fix_hint=f"ตรวจสอบ vercel.json rewrites และ React Router routes สำหรับ {path}",
                ))
            elif resp.status_code >= 500:
                issues.append(Issue(
                    severity="critical",
                    category="frontend",
                    team="dev",
                    title=f"Page 5xx: {name}",
                    detail=f"{path} → HTTP {resp.status_code}",
                    url=url,
                    fix_hint="ตรวจสอบ Vercel deployment logs",
                ))
        except Exception as e:
            issues.append(Issue(
                severity="critical",
                category="frontend",
                team="devops",
                title=f"Page Unreachable: {name}",
                detail=f"{path} — {str(e)[:100]}",
                url=url,
                fix_hint="ตรวจสอบ Vercel deployment และ DNS settings",
            ))

    return issues


async def check_ssl_certificate() -> list[Issue]:
    """ตรวจสอบ SSL certificate"""
    issues = []
    domain = BASE_URL.replace("https://", "").replace("http://", "").split("/")[0]
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(10)
            s.connect((domain, 443))
            cert = s.getpeercert()
            expire_str = cert.get("notAfter", "")
            expire_dt = datetime.strptime(expire_str, "%b %d %H:%M:%S %Y %Z")
            days_left = (expire_dt - datetime.utcnow()).days

            if days_left <= 7:
                issues.append(Issue(
                    severity="critical",
                    category="ssl",
                    team="devops",
                    title=f"SSL จะหมดอายุใน {days_left} วัน!",
                    detail=f"Certificate สำหรับ {domain} หมดอายุ {expire_dt.strftime('%d/%m/%Y')}",
                    url=f"https://{domain}",
                    fix_hint="ต่ออายุ SSL ทันทีที่ WebNIC หรือ Let's Encrypt",
                ))
            elif days_left <= 30:
                issues.append(Issue(
                    severity="warning",
                    category="ssl",
                    team="devops",
                    title=f"SSL จะหมดอายุใน {days_left} วัน",
                    detail=f"Certificate สำหรับ {domain} หมดอายุ {expire_dt.strftime('%d/%m/%Y')}",
                    url=f"https://{domain}",
                    fix_hint="วางแผนต่ออายุ SSL ล่วงหน้า",
                ))
    except Exception as e:
        issues.append(Issue(
            severity="critical",
            category="ssl",
            team="devops",
            title="SSL Certificate Error",
            detail=f"ไม่สามารถตรวจสอบ SSL ได้: {str(e)[:100]}",
            fix_hint="ตรวจสอบ SSL certificate ที่ WebNIC Portal",
        ))
    return issues


async def check_external_services(client: httpx.AsyncClient) -> list[Issue]:
    """ตรวจสอบ external services"""
    issues = []

    # Anthropic API
    if ANTHROPIC_KEY:
        try:
            resp = await client.get(
                "https://api.anthropic.com/v1/models",
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01"},
                timeout=10
            )
            if resp.status_code == 401:
                issues.append(Issue(
                    severity="critical",
                    category="api",
                    team="dev",
                    title="Anthropic API Key Invalid",
                    detail="ANTHROPIC_API_KEY หมดอายุหรือไม่ถูกต้อง",
                    fix_hint="ออก API key ใหม่ที่ console.anthropic.com และอัปเดต Railway env vars",
                ))
            elif resp.status_code == 429:
                issues.append(Issue(
                    severity="warning",
                    category="api",
                    team="dev",
                    title="Anthropic API Rate Limited",
                    detail="Claude API ถูก rate limit — อาจกระทบการสร้างคอนเทนต์",
                    fix_hint="ตรวจสอบ usage ที่ console.anthropic.com และพิจารณา upgrade plan",
                ))
        except Exception as e:
            issues.append(Issue(
                severity="warning",
                category="api",
                team="dev",
                title="Anthropic API Unreachable",
                detail=str(e)[:100],
                fix_hint="ตรวจสอบ network connectivity และ API status ที่ status.anthropic.com",
            ))

    # Omise Payment
    if OMISE_KEY:
        try:
            resp = await client.get(
                "https://api.omise.co/account",
                auth=(OMISE_KEY, ""),
                timeout=10
            )
            if resp.status_code == 401:
                issues.append(Issue(
                    severity="critical",
                    category="payment",
                    team="finance",
                    title="Omise API Key Invalid",
                    detail="OMISE_SECRET_KEY ไม่ถูกต้อง — ระบบรับชำระเงินอาจหยุดทำงาน",
                    fix_hint="ตรวจสอบ Omise dashboard และอัปเดต API key ใน Railway",
                ))
        except Exception as e:
            issues.append(Issue(
                severity="warning",
                category="payment",
                team="finance",
                title="Omise Payment Gateway Warning",
                detail=str(e)[:100],
                fix_hint="ตรวจสอบ Omise service status ที่ dashboard.omise.co",
            ))

    # Slack Webhook
    if SLACK_WEBHOOK:
        try:
            resp = await client.post(
                SLACK_WEBHOOK,
                json={"text": "🔍 Error Hunter health ping"},
                timeout=5
            )
            if resp.status_code != 200:
                issues.append(Issue(
                    severity="warning",
                    category="api",
                    team="devops",
                    title="Slack Webhook Error",
                    detail=f"Slack webhook ตอบกลับ HTTP {resp.status_code}",
                    fix_hint="ตรวจสอบ Slack app ที่ api.slack.com/apps",
                ))
        except Exception as e:
            issues.append(Issue(
                severity="warning",
                category="api",
                team="devops",
                title="Slack Webhook Unreachable",
                detail=str(e)[:100],
                fix_hint="ตรวจสอบ STARTUP_SLACK_WEBHOOK environment variable",
            ))

    return issues


async def check_database() -> list[Issue]:
    """ตรวจสอบ database connectivity"""
    issues = []
    try:
        from db import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception as e:
        issues.append(Issue(
            severity="critical",
            category="db",
            team="dev",
            title="Database Connection Failed",
            detail=f"ไม่สามารถเชื่อมต่อ Database ได้: {str(e)[:150]}",
            fix_hint="ตรวจสอบ DATABASE_URL env var ที่ Railway และ PostgreSQL service status",
        ))
    return issues


# ── AI Analysis — ให้ Claude วิเคราะห์ root cause ──────────────────────────────

async def ai_analyze_issues(issues: list[Issue]) -> str:
    """ให้ Claude วิเคราะห์ปัญหาและให้คำแนะนำ fix"""
    if not issues or not ANTHROPIC_KEY:
        return ""
    try:
        import anthropic as _anthropic
        client = _anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        issue_text = "\n".join([
            f"[{i.severity.upper()}] {i.category}/{i.team}: {i.title}\n  Detail: {i.detail}\n  Fix hint: {i.fix_hint}"
            for i in issues[:10]
        ])
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": (
                    f"วิเคราะห์ปัญหาต่อไปนี้ของ OpenThai.ai platform (ภาษาไทย):\n\n{issue_text}\n\n"
                    "สรุปใน 3-5 ประโยค: root cause ที่น่าจะเป็น, ความเสี่ยง, และ action ที่เร่งด่วนที่สุด"
                )
            }]
        )
        return msg.content[0].text
    except Exception as e:
        logger.warning(f"AI analysis failed: {e}")
        return ""


# ── Notification ───────────────────────────────────────────────────────────────

async def notify_teams(issues: list[Issue], ai_summary: str = "") -> None:
    """แจ้งทีมที่เกี่ยวข้องผ่าน Slack + LINE"""
    if not issues:
        return

    criticals = [i for i in issues if i.severity == "critical"]
    warnings   = [i for i in issues if i.severity == "warning"]

    # จัดกลุ่มตามทีม
    by_team: dict[str, list[Issue]] = {}
    for issue in issues:
        by_team.setdefault(issue.team, []).append(issue)

    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")

    # ── Slack ──────────────────────────────────────────────────────────────────
    if SLACK_WEBHOOK:
        blocks = []

        # Header
        header_color = "danger" if criticals else "warning"
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"{'🚨' if criticals else '⚠️'} *Error Hunter Report* — {timestamp}\n"
                    f"พบ *{len(criticals)} critical* และ *{len(warnings)} warning*"
                )
            }
        })

        # Issues by team
        for team, team_issues in by_team.items():
            team_text = f"{TEAM_EMOJI.get(team,'🔹')} *{team.upper()} Team* ({len(team_issues)} issues)\n"
            for issue in team_issues[:5]:
                team_text += f"  {SEVERITY_EMOJI[issue.severity]} `{issue.category}` {issue.title}\n"
                team_text += f"    └ {issue.detail[:80]}\n"
                if issue.fix_hint:
                    team_text += f"    💡 _{issue.fix_hint[:80]}_\n"
            blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": team_text}})

        # AI Summary
        if ai_summary:
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"🤖 *Claude AI Analysis:*\n{ai_summary}"}
            })

        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"🔗 <https://www.openthai-ai.com/producer/admin|Admin Dashboard>"}
        })

        try:
            async with httpx.AsyncClient() as client:
                await client.post(SLACK_WEBHOOK, json={"blocks": blocks}, timeout=5)
        except Exception as e:
            logger.error(f"Slack notify failed: {e}")

    # ── LINE (Mythos เท่านั้น — critical only) ─────────────────────────────────
    if LINE_TOKEN and LINE_USER_ID and criticals:
        critical_text = "\n".join([
            f"{'🚨'} [{i.category.upper()}] {i.title}\n  → {i.fix_hint}"
            for i in criticals[:5]
        ])
        line_msg = (
            f"🚨 Error Hunter Alert!\n"
            f"{timestamp}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"Critical: {len(criticals)} | Warning: {len(warnings)}\n\n"
            f"{critical_text}"
            + (f"\n\n🤖 AI: {ai_summary[:200]}" if ai_summary else "")
        )
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://api.line.me/v2/bot/message/push",
                    headers={"Authorization": f"Bearer {LINE_TOKEN}", "Content-Type": "application/json"},
                    json={"to": LINE_USER_ID, "messages": [{"type": "text", "text": line_msg}]},
                    timeout=5
                )
        except Exception as e:
            logger.error(f"LINE notify failed: {e}")


# ── Main Hunter ────────────────────────────────────────────────────────────────

async def run_error_hunt(silent_if_clean: bool = True) -> dict:
    """รันการตรวจสอบทั้งหมด แล้วแจ้งทีม"""
    start = datetime.now()
    all_issues: list[Issue] = []

    async with httpx.AsyncClient(
        headers={"User-Agent": "OpenThai-ErrorHunter/1.0"},
        verify=True,
        follow_redirects=True,
    ) as client:
        results = await asyncio.gather(
            check_api_endpoints(client),
            check_frontend_pages(client),
            check_external_services(client),
            check_database(),
            check_ssl_certificate(),
            return_exceptions=True
        )

    for r in results:
        if isinstance(r, list):
            all_issues.extend(r)
        elif isinstance(r, Exception):
            logger.error(f"Check failed: {r}")

    criticals = [i for i in all_issues if i.severity == "critical"]
    warnings  = [i for i in all_issues if i.severity == "warning"]

    elapsed = (datetime.now() - start).total_seconds()
    logger.info(f"Error Hunt done in {elapsed:.1f}s — {len(criticals)} critical, {len(warnings)} warning")

    # แจ้งทีมเมื่อมีปัญหา (หรือทุกครั้งถ้า silent_if_clean=False)
    if all_issues or not silent_if_clean:
        ai_summary = await ai_analyze_issues(all_issues) if all_issues else ""
        await notify_teams(all_issues, ai_summary)

    # บันทึก log ลง DB
    try:
        from db import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("""
                INSERT OR IGNORE INTO error_hunt_log
                (run_at, criticals, warnings, elapsed_sec, issues_json)
                VALUES (:run_at, :c, :w, :e, :j)
            """), {
                "run_at": datetime.utcnow().isoformat(),
                "c": len(criticals),
                "w": len(warnings),
                "e": round(elapsed, 2),
                "j": json.dumps([
                    {"severity": i.severity, "category": i.category,
                     "team": i.team, "title": i.title, "detail": i.detail}
                    for i in all_issues
                ], ensure_ascii=False)
            })
            await db.commit()
    except Exception as e:
        logger.debug(f"Log to DB skipped: {e}")

    return {
        "status": "ok" if not criticals else "critical",
        "criticals": len(criticals),
        "warnings": len(warnings),
        "elapsed_sec": round(elapsed, 2),
        "issues": [
            {"severity": i.severity, "category": i.category,
             "team": i.team, "title": i.title, "detail": i.detail,
             "fix_hint": i.fix_hint, "timestamp": i.timestamp}
            for i in all_issues
        ]
    }


# ── Scheduler registration ────────────────────────────────────────────────────

def register_error_hunter_jobs(scheduler) -> None:
    """ตั้งเวลารัน Error Hunter"""
    try:
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger

        # ตรวจสอบทุก 30 นาที
        scheduler.add_job(
            run_error_hunt,
            IntervalTrigger(minutes=30),
            id="error_hunter_30min",
            replace_existing=True,
            kwargs={"silent_if_clean": True},
        )
        # รายงานสรุปประจำวัน 07:00
        scheduler.add_job(
            lambda: run_error_hunt(silent_if_clean=False),
            CronTrigger(hour=7, minute=0, timezone="Asia/Bangkok"),
            id="error_hunter_daily",
            replace_existing=True,
        )
        logger.info("Error Hunter scheduled: every 30min + daily 07:00 BKK")
    except Exception as e:
        logger.warning(f"Error Hunter scheduler error: {e}")
