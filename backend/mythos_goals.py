"""
OpenThai AI — Mythos Goal Tracker 24/7
ระบบติดตามเป้าหมาย OKR อัตโนมัติสำหรับ Mythos และบรรษัทข้ามชาติ

โครงสร้าง:
  Objective (เป้าหมายใหญ่)
  └── Key Results (ตัวชี้วัดย่อย × 3-5 ข้อ)
       └── Check-ins (บันทึกความคืบหน้าอัตโนมัติ/ด้วยตนเอง)
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import limits as _limits
import anthropic
import httpx

logger = logging.getLogger("openthai.goals")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

# ── Period helpers ─────────────────────────────────────────────────────────────

def current_quarter() -> str:
    m = datetime.utcnow().month
    q = (m - 1) // 3 + 1
    y = datetime.utcnow().year
    return f"{y}-Q{q}"

def quarter_dates(period: str):
    """'2026-Q2' → (start, end) datetime"""
    y, q = int(period[:4]), int(period[-1])
    ms = (q - 1) * 3 + 1
    start = datetime(y, ms, 1)
    me = ms + 2
    last_day = 31 if me in (1,3,5,7,8,10,12) else 30 if me in (4,6,9,11) else 28
    end = datetime(y, me, last_day, 23, 59, 59)
    return start, end

def pace_expected(start: datetime, end: datetime, now: Optional[datetime] = None) -> float:
    """0.0-1.0 — ควรเสร็จไปแล้วกี่ % ณ วันนี้"""
    now = now or datetime.utcnow()
    total = (end - start).total_seconds()
    elapsed = max(0, (now - start).total_seconds())
    return min(1.0, elapsed / total) if total > 0 else 1.0

# ── AI Analysis ────────────────────────────────────────────────────────────────

GOAL_ANALYST_PROMPT = """คุณคือ Strategy Analyst AI สำหรับ Mythos ประธาน OpenThai AI Group
วิเคราะห์ความคืบหน้าของเป้าหมายและให้คำแนะนำเชิงกลยุทธ์

ตอบเป็น JSON เสมอ (ไม่มี markdown):
{
  "health": "on_track|at_risk|off_track|achieved|not_started",
  "health_reason": "อธิบาย 1 ประโยค",
  "confidence": 0.85,
  "recommendation": "คำแนะนำเฉพาะเจาะจง 2-3 ประโยค",
  "blockers": ["อุปสรรคที่ 1", "อุปสรรคที่ 2"],
  "next_actions": ["action ที่ 1", "action ที่ 2", "action ที่ 3"],
  "escalation_needed": false,
  "escalate_to": ""
}"""

async def analyze_goal_health(
    objective: str,
    key_results: list[dict],
    owner: str,
    pace_pct: float,
    context: str = "",
) -> dict:
    try:
        kr_summary = "\n".join(
            f"- {kr['title']}: {kr['current_value']}/{kr['target_value']} "
            f"({kr.get('unit','')}) = {kr.get('progress_pct',0):.0f}%"
            for kr in key_results
        )
        avg_progress = (
            sum(kr.get("progress_pct", 0) for kr in key_results) / len(key_results)
            if key_results else 0
        )
        prompt = f"""Objective: {objective}
Owner: {owner}
Period pace: {pace_pct*100:.0f}% ผ่านไปแล้ว
Average KR progress: {avg_progress:.0f}%

Key Results:
{kr_summary}

Context: {context or 'ไม่มี'}

วิเคราะห์สุขภาพเป้าหมายนี้"""

        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=_limits.get("claude_max_tokens_goal", 1500),
            system=GOAL_ANALYST_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
        try:
            from token_counter import record_usage
            import asyncio
            asyncio.create_task(record_usage("goal_health", resp.usage.input_tokens, resp.usage.output_tokens))
        except Exception:
            pass
        return result
    except Exception as e:
        logger.error("analyze_goal_health: %s", e)
        avg = sum(kr.get("progress_pct", 0) for kr in key_results) / max(1, len(key_results))
        health = (
            "achieved" if avg >= 100 else
            "on_track" if avg >= pace_pct * 100 * 0.85 else
            "at_risk" if avg >= pace_pct * 100 * 0.60 else
            "off_track"
        )
        return {
            "health": health, "health_reason": f"avg {avg:.0f}% vs pace {pace_pct*100:.0f}%",
            "confidence": 0.5, "recommendation": "ตรวจสอบ KR แต่ละข้อ",
            "blockers": [], "next_actions": [], "escalation_needed": False, "escalate_to": "",
        }

# ── LINE Notifications ─────────────────────────────────────────────────────────

async def _line(token_env: str, msg: str) -> bool:
    token = os.getenv(token_env, "")
    if not token:
        logger.info("[LINE-DEV:%s] %s", token_env, msg[:80])
        return False
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(
                "https://notify-api.line.me/api/notify",
                headers={"Authorization": f"Bearer {token}"},
                data={"message": msg},
                timeout=_limits.get("timeout_line_notify", 15),
            )
            return r.status_code == 200
    except Exception as e:
        logger.error("LINE %s: %s", token_env, e)
        return False

HEALTH_ICON = {
    "on_track": "🟢", "at_risk": "🟡", "off_track": "🔴",
    "achieved": "🏆", "not_started": "⚪",
}

async def alert_goal_risk(goal: dict, analysis: dict, key_results: list[dict]) -> None:
    """แจ้ง Mythos + owner เมื่อเป้าหมายมีความเสี่ยง"""
    health = analysis.get("health", "at_risk")
    icon = HEALTH_ICON.get(health, "🟡")
    kr_lines = "\n".join(
        f"  {HEALTH_ICON.get('on_track' if kr.get('progress_pct',0)>=75 else 'at_risk','🟡')} "
        f"{kr['title']}: {kr.get('progress_pct',0):.0f}%"
        for kr in key_results[:5]
    )
    blockers = "\n".join(f"  ⛔ {b}" for b in analysis.get("blockers", []))
    actions = "\n".join(f"  ▶ {a}" for a in analysis.get("next_actions", [])[:3])
    msg = (
        f"\n{'━'*22}"
        f"\n{icon} GOAL ALERT — {health.upper()}"
        f"\n{'━'*22}"
        f"\n🎯 {goal['objective']}"
        f"\n👤 Owner: {goal.get('owner_title','')}"
        f"\n📅 {goal.get('period','')}"
        f"\n\n📊 Key Results:\n{kr_lines}"
        f"\n\n💡 {analysis.get('recommendation','')}"
        f"{chr(10) + blockers if blockers else ''}"
        f"{chr(10) + '📋 Next Actions:' + chr(10) + actions if actions else ''}"
        f"\n{'━'*22}"
        f"\n🔗 https://www.openthai-ai.com/#mythos"
    )
    await _line("LINE_MYTHOS_CEO", msg)
    owner_token = f"LINE_MYTHOS_{goal.get('owner','').upper()}"
    if owner_token != "LINE_MYTHOS_CEO":
        await _line(owner_token, msg)

# ── 24/7 Auto-tracker ─────────────────────────────────────────────────────────

async def run_goal_tracker() -> dict:
    """ตรวจสุขภาพเป้าหมายทุก 4 ชม. — แจ้ง LINE หาก at_risk หรือ off_track"""
    logger.info("Goal tracker running...")
    alerted = 0
    checked = 0
    try:
        from db import AsyncSessionLocal, MythosGoal, MythosKeyResult, MythosGoalAnalysis
        from sqlalchemy import select, desc
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(MythosGoal).where(MythosGoal.status == "active")
            )
            goals = res.scalars().all()

            for goal in goals:
                checked += 1
                # Get KRs
                kr_res = await db.execute(
                    select(MythosKeyResult).where(MythosKeyResult.goal_id == goal.id)
                )
                krs = kr_res.scalars().all()

                # Compute progress
                start, end = quarter_dates(goal.period)
                pace = pace_expected(start, end)
                kr_dicts = [
                    {
                        "title": kr.title, "current_value": kr.current_value,
                        "target_value": kr.target_value, "unit": kr.unit,
                        "progress_pct": min(100.0, kr.current_value / kr.target_value * 100)
                        if kr.target_value else 0,
                    }
                    for kr in krs
                ]

                # Update goal avg progress
                avg = (
                    sum(k["progress_pct"] for k in kr_dicts) / len(kr_dicts)
                    if kr_dicts else 0
                )
                goal.progress_pct = avg
                goal.last_checked = datetime.utcnow()

                # AI analysis
                analysis = await analyze_goal_health(
                    goal.objective, kr_dicts, goal.owner, pace
                )
                health = analysis.get("health", "at_risk")
                goal.health = health
                goal.health_reason = analysis.get("health_reason", "")

                # Save analysis log
                log = MythosGoalAnalysis(
                    goal_id=goal.id,
                    health=health,
                    confidence=analysis.get("confidence", 0.5),
                    recommendation=analysis.get("recommendation", ""),
                    blockers=json.dumps(analysis.get("blockers", []), ensure_ascii=False),
                    next_actions=json.dumps(analysis.get("next_actions", []), ensure_ascii=False),
                    pace_pct=pace,
                    avg_progress_pct=avg,
                )
                db.add(log)

                # Alert if risky and not alerted recently
                should_alert = (
                    health in ("at_risk", "off_track") and
                    (
                        goal.last_alerted is None or
                        (datetime.utcnow() - goal.last_alerted).total_seconds() > 3600 * 8
                    )
                )
                if should_alert:
                    await alert_goal_risk(
                        {"objective": goal.objective, "owner": goal.owner,
                         "owner_title": goal.owner_title, "period": goal.period},
                        analysis, kr_dicts,
                    )
                    goal.last_alerted = datetime.utcnow()
                    alerted += 1

            await db.commit()
    except Exception as e:
        logger.error("Goal tracker error: %s", e)

    return {"checked": checked, "alerted": alerted, "timestamp": datetime.utcnow().isoformat()}


async def generate_weekly_goal_report() -> dict:
    """ทุกวันจันทร์ 08:00 — สรุปความคืบหน้า OKR ทั้งหมดส่ง Mythos"""
    try:
        from db import AsyncSessionLocal, MythosGoal, MythosKeyResult
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(MythosGoal).where(MythosGoal.status == "active"))
            goals = res.scalars().all()

        if not goals:
            await _line("LINE_MYTHOS_CEO", "\n👑 Weekly Goal Report\nยังไม่มีเป้าหมาย · เพิ่มที่ https://www.openthai-ai.com/#mythos")
            return {"goals": 0}

        on_track = sum(1 for g in goals if g.health == "on_track")
        at_risk  = sum(1 for g in goals if g.health == "at_risk")
        off_track= sum(1 for g in goals if g.health == "off_track")
        achieved = sum(1 for g in goals if g.health == "achieved")

        lines = []
        for g in goals[:8]:
            icon = HEALTH_ICON.get(g.health, "🟡")
            lines.append(f"  {icon} {g.objective[:45]} ({g.progress_pct:.0f}%)")

        msg = (
            f"\n{'━'*24}"
            f"\n👑 MYTHOS WEEKLY OKR REPORT"
            f"\n{datetime.now().strftime('%A %d %B %Y')}"
            f"\n{'━'*24}"
            f"\n\n📊 SUMMARY"
            f"\n🏆 Achieved:  {achieved}"
            f"\n🟢 On Track:  {on_track}"
            f"\n🟡 At Risk:   {at_risk}"
            f"\n🔴 Off Track: {off_track}"
            f"\n\n🎯 OBJECTIVES\n" + "\n".join(lines) +
            f"\n\n{'━'*24}"
            f"\n🔗 https://www.openthai-ai.com/#mythos"
        )
        await _line("LINE_MYTHOS_CEO", msg)

        # Email digest
        try:
            from email_utils import _send
            to = os.getenv("EMAIL_MYTHOS", os.getenv("NEWS_DIGEST_EMAIL", ""))
            if to:
                rows = "".join(
                    f"<tr><td style='padding:6px;'>{HEALTH_ICON.get(g.health,'🟡')}</td>"
                    f"<td style='padding:6px;'>{g.objective}</td>"
                    f"<td style='padding:6px;'>{g.owner_title}</td>"
                    f"<td style='padding:6px;'>"
                    f"<div style='background:#eee;border-radius:4px;height:8px;'>"
                    f"<div style='background:{'#27AE60' if g.health=='on_track' else '#F39C12' if g.health=='at_risk' else '#e74c3c'};width:{min(100,g.progress_pct):.0f}%;height:100%;border-radius:4px;'></div>"
                    f"</div><span style='font-size:0.75rem;'>{g.progress_pct:.0f}%</span></td></tr>"
                    for g in goals[:15]
                )
                html = f"""<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
<div style="background:linear-gradient(135deg,#1A1A2E,#0F3460);color:white;padding:24px;border-radius:12px 12px 0 0;">
<h1 style="margin:0;">👑 Weekly OKR Report</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.7);">{datetime.now().strftime('%A, %d %B %Y')}</p>
</div>
<div style="background:white;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;">
<div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
<div style="background:#e8f5e9;padding:12px 20px;border-radius:10px;text-align:center;"><strong style="font-size:1.5rem;color:#27AE60;">{on_track}</strong><br><span style="font-size:0.8rem;">On Track</span></div>
<div style="background:#fff3e0;padding:12px 20px;border-radius:10px;text-align:center;"><strong style="font-size:1.5rem;color:#F39C12;">{at_risk}</strong><br><span style="font-size:0.8rem;">At Risk</span></div>
<div style="background:#ffebee;padding:12px 20px;border-radius:10px;text-align:center;"><strong style="font-size:1.5rem;color:#e74c3c;">{off_track}</strong><br><span style="font-size:0.8rem;">Off Track</span></div>
<div style="background:#fff8e1;padding:12px 20px;border-radius:10px;text-align:center;"><strong style="font-size:1.5rem;color:#FFD700;">{achieved}</strong><br><span style="font-size:0.8rem;">Achieved</span></div>
</div>
<table style="width:100%;border-collapse:collapse;">
<thead><tr style="background:#f5f5f5;">
<th style="padding:8px;text-align:left;">Status</th><th style="padding:8px;text-align:left;">Objective</th>
<th style="padding:8px;text-align:left;">Owner</th><th style="padding:8px;text-align:left;">Progress</th>
</tr></thead><tbody>{rows}</tbody></table>
<p style="text-align:center;margin-top:16px;"><a href="https://www.openthai-ai.com/#mythos" style="background:#FF6B35;color:white;padding:10px 24px;border-radius:20px;text-decoration:none;font-weight:700;">Open Goal Tracker →</a></p>
</div></div>"""
                await _send(to, f"👑 Weekly OKR — {datetime.now().strftime('%d/%m/%Y')}", html)
        except Exception as e:
            logger.warning("Weekly email error: %s", e)

        return {"goals": len(goals), "on_track": on_track, "at_risk": at_risk, "off_track": off_track}
    except Exception as e:
        logger.error("weekly report error: %s", e)
        return {"error": str(e)}


def register_goal_jobs(scheduler) -> None:
    """เพิ่ม Goal Tracker jobs เข้า scheduler"""
    try:
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger

        # ตรวจสุขภาพเป้าหมายทุก 4 ชั่วโมง
        scheduler.add_job(
            run_goal_tracker,
            IntervalTrigger(hours=4),
            id="goal_tracker",
            replace_existing=True,
            misfire_grace_time=300,
        )

        # Weekly report ทุกวันจันทร์ 08:00 BKK
        scheduler.add_job(
            generate_weekly_goal_report,
            CronTrigger(day_of_week="mon", hour=8, minute=5, timezone="Asia/Bangkok"),
            id="weekly_goal_report",
            replace_existing=True,
        )
        logger.info("Goal tracker scheduled: every 4h + Monday 08:05 BKK")
    except Exception as e:
        logger.warning("Goal scheduler error: %s", e)
