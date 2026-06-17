"""
OpenThai AI — Mythos Command System 24/7
ระบบสั่งงานอัตโนมัติของ Mythos ภายใต้บรรษัทข้ามชาติ

โครงสร้างองค์กร:
  Chairman & CEO: Mythos
  ├── C-Suite: CFO · CTO · COO · CMO · CLO
  ├── Regions: TH Director · SEA Director · Global Director
  └── Departments: Dev · Sales · Finance · Legal · HR · Operations
"""

import os
import json
import logging
import secrets
import limits as _limits
from datetime import datetime, timezone, timedelta
from typing import Optional
import anthropic
import httpx

logger = logging.getLogger("openthai.mythos")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

# ── Corporate Org Chart ────────────────────────────────────────────────────────

ORG = {
    # ── C-Suite ──────────────────────────────────────────────────────────────
    "cfo": {
        "title": "CFO",
        "name_th": "ประธานเจ้าหน้าที่ฝ่ายการเงิน",
        "emoji": "💰",
        "tier": "c_suite",
        "owns": ["finance", "investor_relations", "treasury"],
        "line_token_env": "LINE_MYTHOS_CFO",
        "email_env": "EMAIL_CFO",
        "kpi": ["revenue", "burn_rate", "gross_margin", "cash_runway"],
    },
    "cto": {
        "title": "CTO",
        "name_th": "ประธานเจ้าหน้าที่ฝ่ายเทคโนโลยี",
        "emoji": "⚙️",
        "tier": "c_suite",
        "owns": ["dev", "infrastructure", "security", "ai_research"],
        "line_token_env": "LINE_MYTHOS_CTO",
        "email_env": "EMAIL_CTO",
        "kpi": ["uptime", "deploy_freq", "tech_debt", "ai_performance"],
    },
    "coo": {
        "title": "COO",
        "name_th": "ประธานเจ้าหน้าที่ฝ่ายปฏิบัติการ",
        "emoji": "🔄",
        "tier": "c_suite",
        "owns": ["ops", "hr", "supply_chain", "th", "sea", "global"],
        "line_token_env": "LINE_MYTHOS_COO",
        "email_env": "EMAIL_COO",
        "kpi": ["ops_efficiency", "headcount", "nps", "sla_compliance"],
    },
    "cmo": {
        "title": "CMO",
        "name_th": "ประธานเจ้าหน้าที่ฝ่ายการตลาด",
        "emoji": "📣",
        "tier": "c_suite",
        "owns": ["sales", "marketing", "brand", "affiliate"],
        "line_token_env": "LINE_MYTHOS_CMO",
        "email_env": "EMAIL_CMO",
        "kpi": ["mrr", "cac", "conversion_rate", "brand_reach"],
    },
    "clo": {
        "title": "CLO",
        "name_th": "ประธานเจ้าหน้าที่ฝ่ายกฎหมาย",
        "emoji": "⚖️",
        "tier": "c_suite",
        "owns": ["legal", "compliance", "ip", "contracts"],
        "line_token_env": "LINE_MYTHOS_CLO",
        "email_env": "EMAIL_CLO",
        "kpi": ["open_cases", "compliance_score", "contract_turnaround"],
    },
    # ── Regions ───────────────────────────────────────────────────────────────
    "th_director": {
        "title": "TH Director",
        "name_th": "ผู้อำนวยการประเทศไทย",
        "emoji": "🇹🇭",
        "tier": "regional",
        "owns": ["th_sales", "th_ops", "th_support", "otop_partnerships"],
        "line_token_env": "LINE_MYTHOS_TH",
        "email_env": "EMAIL_TH",
        "kpi": ["th_revenue", "th_users", "th_churn", "th_nps"],
    },
    "sea_director": {
        "title": "SEA Director",
        "name_th": "ผู้อำนวยการภูมิภาคเอเชียตะวันออกเฉียงใต้",
        "emoji": "🌏",
        "tier": "regional",
        "owns": ["vn", "my", "sg", "ph", "id", "mm"],
        "line_token_env": "LINE_MYTHOS_SEA",
        "email_env": "EMAIL_SEA",
        "kpi": ["sea_revenue", "sea_expansion_pace", "sea_partnerships"],
    },
    "global_director": {
        "title": "Global Director",
        "name_th": "ผู้อำนวยการระดับโลก",
        "emoji": "🌍",
        "tier": "regional",
        "owns": ["us", "eu", "cn", "jp", "au", "global_partnerships"],
        "line_token_env": "LINE_MYTHOS_GLOBAL",
        "email_env": "EMAIL_GLOBAL",
        "kpi": ["global_revenue", "intl_expansion", "global_brand"],
    },
    # ── Departments ───────────────────────────────────────────────────────────
    "dev": {
        "title": "Head of Engineering",
        "name_th": "หัวหน้าฝ่ายวิศวกรรม",
        "emoji": "🔧",
        "tier": "department",
        "owns": ["backend", "frontend", "mobile", "devops", "ai_ml"],
        "line_token_env": "LINE_MYTHOS_DEV",
        "email_env": "EMAIL_DEV",
        "kpi": ["sprint_velocity", "bug_backlog", "pr_cycle_time"],
    },
    "sales": {
        "title": "Head of Sales",
        "name_th": "หัวหน้าฝ่ายขาย",
        "emoji": "💼",
        "tier": "department",
        "owns": ["b2c_sales", "b2b_sales", "affiliate", "partnerships"],
        "line_token_env": "LINE_MYTHOS_SALES",
        "email_env": "EMAIL_SALES",
        "kpi": ["pipeline_value", "win_rate", "avg_deal_size", "quota_attainment"],
    },
    "finance": {
        "title": "Head of Finance",
        "name_th": "หัวหน้าฝ่ายการเงิน",
        "emoji": "📊",
        "tier": "department",
        "owns": ["accounting", "payroll", "tax", "budgeting"],
        "line_token_env": "LINE_MYTHOS_FINANCE",
        "email_env": "EMAIL_FINANCE",
        "kpi": ["ar_days", "ap_days", "budget_variance", "forecast_accuracy"],
    },
    "legal": {
        "title": "Head of Legal",
        "name_th": "หัวหน้าฝ่ายกฎหมาย",
        "emoji": "📜",
        "tier": "department",
        "owns": ["contracts", "ip", "regulatory", "pdpa", "employment_law"],
        "line_token_env": "LINE_MYTHOS_LEGAL",
        "email_env": "EMAIL_LEGAL",
        "kpi": ["open_contracts", "compliance_issues", "legal_costs"],
    },
    "hr": {
        "title": "Head of HR",
        "name_th": "หัวหน้าฝ่ายทรัพยากรบุคคล",
        "emoji": "👥",
        "tier": "department",
        "owns": ["recruiting", "onboarding", "training", "culture", "payroll_ops"],
        "line_token_env": "LINE_MYTHOS_HR",
        "email_env": "EMAIL_HR",
        "kpi": ["headcount", "attrition_rate", "time_to_hire", "eNPS"],
    },
    "ops": {
        "title": "Head of Operations",
        "name_th": "หัวหน้าฝ่ายปฏิบัติการ",
        "emoji": "🏭",
        "tier": "department",
        "owns": ["customer_support", "logistics", "vendor_mgmt", "facilities"],
        "line_token_env": "LINE_MYTHOS_OPS",
        "email_env": "EMAIL_OPS",
        "kpi": ["ticket_resolution_time", "csat", "ops_cost_ratio"],
    },
}

TIERS = {
    "c_suite":   {"label": "C-Suite Executive", "priority_boost": 3},
    "regional":  {"label": "Regional Director",  "priority_boost": 2},
    "department": {"label": "Department Head",   "priority_boost": 1},
}

# ── AI Directive Decomposer ────────────────────────────────────────────────────

MYTHOS_PROMPT = f"""คุณคือ Chief of Staff AI ของ Mythos ประธานบริหารและผู้ก่อตั้ง OpenThai AI Group
บรรษัทข้ามชาติที่ดำเนินการใน 10+ ประเทศ

เมื่อ Mythos ออก directive ให้:
1. วิเคราะห์ความตั้งใจและเป้าหมายเชิงกลยุทธ์
2. แบ่งงานให้ผู้บริหารที่เหมาะสม (สามารถเลือกหลายคนได้)
3. กำหนด deadline ที่สมจริง
4. ระบุ dependencies ระหว่างงาน
5. กำหนด KPI สำหรับวัดความสำเร็จ

ผู้บริหารในองค์กร:
C-Suite: cfo, cto, coo, cmo, clo
Regional: th_director, sea_director, global_director
Departments: dev, sales, finance, legal, hr, ops

ตอบเป็น JSON เท่านั้น:
{{
  "directive_summary": "สรุป directive ใน 1 ประโยค",
  "strategic_intent": "เป้าหมายเชิงกลยุทธ์",
  "urgency": "critical|urgent|high|normal",
  "tasks": [
    {{
      "assignee": "cto",
      "title": "ชื่องาน",
      "description": "รายละเอียดที่ต้องทำ",
      "deadline_days": 7,
      "deliverable": "สิ่งที่ต้องส่งมอบ",
      "kpi": "วิธีวัดความสำเร็จ",
      "depends_on": []
    }}
  ],
  "success_criteria": "เกณฑ์ความสำเร็จของ directive นี้",
  "review_date_days": 14
}}"""


async def decompose_directive(directive: str, context: str = "") -> dict:
    """Mythos ออก directive → AI แตกงานให้ทุกแผนก"""
    try:
        prompt = f"""Directive จาก Mythos:
{directive}

Context เพิ่มเติม: {context or 'ไม่มี'}

วันที่ออก directive: {datetime.now().strftime('%d/%m/%Y %H:%M')} (Bangkok time)"""

        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=_limits.get("claude_max_tokens_mythos", 4000),
            system=MYTHOS_PROMPT,
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
            asyncio.create_task(record_usage("mythos", resp.usage.input_tokens, resp.usage.output_tokens))
        except Exception:
            pass
        return result
    except Exception as e:
        logger.error("decompose_directive error: %s", e)
        return {
            "directive_summary": directive[:100],
            "strategic_intent": "ดำเนินการตาม directive ของ Mythos",
            "urgency": "normal",
            "tasks": [{"assignee": "coo", "title": directive[:80], "description": directive,
                       "deadline_days": 7, "deliverable": "รายงานความคืบหน้า",
                       "kpi": "complete/incomplete", "depends_on": []}],
            "success_criteria": "งานเสร็จตามกำหนด",
            "review_date_days": 14,
        }


# ── LINE Notify ────────────────────────────────────────────────────────────────

async def notify_executive(exec_id: str, message: str) -> bool:
    info = ORG.get(exec_id, {})
    token = os.getenv(info.get("line_token_env", ""), "")
    if not token:
        logger.info("[LINE-DEV] exec=%s msg=%s", exec_id, message[:80])
        return False
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(
                "https://notify-api.line.me/api/notify",
                headers={"Authorization": f"Bearer {token}"},
                data={"message": message},
                timeout=_limits.get("timeout_line_notify", 15),
            )
            return r.status_code == 200
    except Exception as e:
        logger.error("LINE exec=%s error=%s", exec_id, e)
        return False


async def notify_mythos(message: str) -> bool:
    token = os.getenv("LINE_MYTHOS_CEO", "")
    if not token:
        logger.info("[MYTHOS-LINE] %s", message[:120])
        return False
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(
                "https://notify-api.line.me/api/notify",
                headers={"Authorization": f"Bearer {token}"},
                data={"message": message},
                timeout=_limits.get("timeout_line_notify", 15),
            )
            return r.status_code == 200
    except Exception as e:
        logger.error("Mythos LINE error: %s", e)
        return False


def build_executive_msg(directive_id: str, task: dict, decomposed: dict, exec_info: dict) -> str:
    urgency_icon = {"critical": "🚨", "urgent": "🔴", "high": "🟠", "normal": "🟡"}.get(
        decomposed.get("urgency", "normal"), "🟡"
    )
    deadline = datetime.utcnow() + timedelta(days=task.get("deadline_days", 7))
    return (
        f"\n{'━'*22}"
        f"\n👑 DIRECTIVE จาก Mythos"
        f"\n{'━'*22}"
        f"\n🆔 {directive_id}"
        f"\n{urgency_icon} ความเร่งด่วน: {decomposed.get('urgency','normal').upper()}"
        f"\n\n📋 {task.get('title','')}"
        f"\n\n🎯 เป้าหมาย:\n{decomposed.get('strategic_intent','')}"
        f"\n\n📝 สิ่งที่ต้องทำ:\n{task.get('description','')}"
        f"\n\n📦 Deliverable:\n{task.get('deliverable','')}"
        f"\n\n📊 KPI: {task.get('kpi','')}"
        f"\n\n⏰ Deadline: {deadline.strftime('%d/%m/%Y')} ({task.get('deadline_days',7)} วัน)"
        f"\n\n✅ เกณฑ์ความสำเร็จ:\n{decomposed.get('success_criteria','')}"
        f"\n\n📅 Review: {(datetime.utcnow() + timedelta(days=decomposed.get('review_date_days',14))).strftime('%d/%m/%Y')}"
        f"\n{'━'*22}"
        f"\n💬 อัปเดต: https://www.openthai-ai.com/#tasks"
    )


# ── Issue Directive ────────────────────────────────────────────────────────────

async def issue_directive(
    directive_text: str,
    context: str = "",
    issued_by: str = "Mythos",
) -> dict:
    """
    Mythos ออก directive → AI แตกงาน → แจ้ง C-Suite/Regional/Dept → บันทึก DB
    """
    directive_id = "DIR-" + datetime.now().strftime("%y%m%d-%H%M") + "-" + secrets.token_hex(2).upper()
    logger.info("directive issued | id=%s | by=%s", directive_id, issued_by)

    # AI decompose
    decomposed = await decompose_directive(directive_text, context)
    tasks = decomposed.get("tasks", [])

    # Save directive to DB
    db_task_ids = []
    try:
        from db import AsyncSessionLocal, MythosDirective, ExecutiveTask
        async with AsyncSessionLocal() as db:
            directive_obj = MythosDirective(
                directive_id=directive_id,
                issued_by=issued_by,
                raw_text=directive_text,
                context=context,
                summary=decomposed.get("directive_summary", ""),
                strategic_intent=decomposed.get("strategic_intent", ""),
                urgency=decomposed.get("urgency", "normal"),
                success_criteria=decomposed.get("success_criteria", ""),
                review_date=datetime.utcnow() + timedelta(days=decomposed.get("review_date_days", 14)),
                task_count=len(tasks),
                status="active",
            )
            db.add(directive_obj)

            for task in tasks:
                exec_id = task.get("assignee", "coo")
                exec_info = ORG.get(exec_id, {})
                etask = ExecutiveTask(
                    directive_id=directive_id,
                    assignee=exec_id,
                    assignee_title=exec_info.get("title", exec_id),
                    assignee_tier=exec_info.get("tier", "department"),
                    title=task.get("title", ""),
                    description=task.get("description", ""),
                    deliverable=task.get("deliverable", ""),
                    kpi=task.get("kpi", ""),
                    deadline=datetime.utcnow() + timedelta(days=task.get("deadline_days", 7)),
                    depends_on=",".join(task.get("depends_on", [])),
                    status="assigned",
                )
                db.add(etask)
                db_task_ids.append(exec_id)

            await db.commit()
    except Exception as e:
        logger.warning("DB directive save error: %s", e)

    # Notify each executive via LINE
    notified = []
    for task in tasks:
        exec_id = task.get("assignee", "coo")
        exec_info = ORG.get(exec_id, {})
        msg = build_executive_msg(directive_id, task, decomposed, exec_info)
        ok = await notify_executive(exec_id, msg)
        notified.append({"exec": exec_id, "title": exec_info.get("title", exec_id), "notified": ok})

    # Confirm back to Mythos
    exec_list = "\n".join(
        f"  {ORG.get(t.get('assignee',''), {}).get('emoji','📌')} {ORG.get(t.get('assignee',''), {}).get('title', t.get('assignee',''))} — {t.get('title','')[:50]}"
        for t in tasks
    )
    confirm_msg = (
        f"\n✅ Directive ออกแล้ว — {directive_id}"
        f"\n\n📋 {decomposed.get('directive_summary', '')}"
        f"\n\n🎯 {decomposed.get('strategic_intent', '')}"
        f"\n\n👥 มอบหมาย {len(tasks)} งานให้:"
        f"\n{exec_list}"
        f"\n\n📅 Review: {(datetime.utcnow() + timedelta(days=decomposed.get('review_date_days', 14))).strftime('%d/%m/%Y')}"
    )
    await notify_mythos(confirm_msg)

    return {
        "directive_id": directive_id,
        "summary": decomposed.get("directive_summary", ""),
        "strategic_intent": decomposed.get("strategic_intent", ""),
        "urgency": decomposed.get("urgency", "normal"),
        "tasks": [
            {
                "assignee": t.get("assignee"),
                "exec_title": ORG.get(t.get("assignee", ""), {}).get("title", ""),
                "exec_emoji": ORG.get(t.get("assignee", ""), {}).get("emoji", "📌"),
                "title": t.get("title", ""),
                "deadline_days": t.get("deadline_days", 7),
                "deliverable": t.get("deliverable", ""),
            }
            for t in tasks
        ],
        "notified": notified,
        "success_criteria": decomposed.get("success_criteria", ""),
        "review_date_days": decomposed.get("review_date_days", 14),
    }


# ── Daily Brief Generator ──────────────────────────────────────────────────────

async def generate_daily_brief() -> dict:
    """Daily 08:00 — สรุปสถานะทุก directive + KPI ทุกแผนก ส่งให้ Mythos"""
    try:
        from db import AsyncSessionLocal, MythosDirective, ExecutiveTask
        from sqlalchemy import select, func

        async with AsyncSessionLocal() as db:
            # Active directives
            res = await db.execute(
                select(MythosDirective).where(MythosDirective.status == "active")
                .order_by(MythosDirective.created_at.desc()).limit(20)
            )
            active = res.scalars().all()

            # Task completion stats
            res2 = await db.execute(
                select(ExecutiveTask.status, func.count().label("cnt"))
                .group_by(ExecutiveTask.status)
            )
            task_stats = {row.status: row.cnt for row in res2.all()}

            # Overdue tasks
            res3 = await db.execute(
                select(ExecutiveTask).where(
                    ExecutiveTask.deadline < datetime.utcnow(),
                    ExecutiveTask.status.notin_(["done", "cancelled"])
                ).limit(10)
            )
            overdue = res3.scalars().all()

        total = sum(task_stats.values())
        done = task_stats.get("done", 0)
        pct = int(done / total * 100) if total else 0

        # Build LINE message for Mythos
        overdue_str = ""
        if overdue:
            overdue_str = "\n\n⚠️ งานเกิน deadline:\n" + "\n".join(
                f"  {ORG.get(t.assignee, {}).get('emoji','📌')} {t.title[:45]} ({t.assignee})"
                for t in overdue[:5]
            )

        directive_str = "\n".join(
            f"  {'🔴' if d.urgency=='critical' else '🟠' if d.urgency=='urgent' else '🟡'} {d.directive_id} — {d.summary[:50]}"
            for d in active[:8]
        ) or "  ไม่มี directive ที่ active"

        brief_msg = (
            f"\n{'━'*24}"
            f"\n👑 MYTHOS DAILY BRIEF"
            f"\n{datetime.now().strftime('%A %d %B %Y %H:%M')} BKK"
            f"\n{'━'*24}"
            f"\n\n📊 EXECUTIVE SUMMARY"
            f"\n✅ งานเสร็จ: {done}/{total} ({pct}%)"
            f"\n🔄 In Progress: {task_stats.get('in_progress', 0)}"
            f"\n📋 Assigned: {task_stats.get('assigned', 0)}"
            f"\n{'🚨 Overdue: ' + str(len(overdue)) if overdue else '✅ No overdue tasks'}"
            f"\n\n📌 ACTIVE DIRECTIVES ({len(active)})\n{directive_str}"
            f"{overdue_str}"
            f"\n\n{'━'*24}"
            f"\n🌏 Good morning, Mythos."
            f"\n🔗 Dashboard: https://www.openthai-ai.com/#mythos"
        )

        await notify_mythos(brief_msg)

        # Send email digest
        try:
            from email_utils import _send
            email_to = os.getenv("EMAIL_MYTHOS", os.getenv("NEWS_DIGEST_EMAIL", ""))
            if email_to:
                rows = "".join(
                    f"<tr><td style='padding:6px 8px;'>{'🔴' if d.urgency=='critical' else '🟠'} {d.directive_id}</td>"
                    f"<td style='padding:6px;'>{d.summary}</td>"
                    f"<td style='padding:6px;color:#888;'>{d.urgency}</td></tr>"
                    for d in active[:10]
                )
                html = f"""<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
<div style="background:linear-gradient(135deg,#1A1A2E,#0F3460);color:white;padding:24px;border-radius:12px 12px 0 0;">
<h1 style="margin:0;font-size:1.4rem;">👑 Mythos Daily Brief</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.7);">{datetime.now().strftime('%A, %d %B %Y')}</p>
</div>
<div style="background:white;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;">
<h3 style="color:#1A1A2E;">📊 Executive Summary</h3>
<p>✅ Tasks Done: <strong>{done}/{total} ({pct}%)</strong> &nbsp;|&nbsp; 🚨 Overdue: <strong>{len(overdue)}</strong></p>
<h3 style="color:#1A1A2E;margin-top:16px;">📌 Active Directives</h3>
<table style="width:100%;border-collapse:collapse;"><thead>
<tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;">ID</th><th style="padding:8px;text-align:left;">Summary</th><th style="padding:8px;text-align:left;">Urgency</th></tr>
</thead><tbody>{rows}</tbody></table>
<p style="text-align:center;margin-top:16px;"><a href="https://www.openthai-ai.com/#mythos" style="background:#FF6B35;color:white;padding:10px 24px;border-radius:20px;text-decoration:none;font-weight:700;">Open Command Center →</a></p>
</div></div>"""
                await _send(email_to, f"👑 Mythos Daily Brief — {datetime.now().strftime('%d/%m/%Y')}", html)
        except Exception as e:
            logger.warning("Brief email error: %s", e)

        return {"status": "sent", "directives": len(active), "tasks_done": done, "tasks_total": total, "overdue": len(overdue)}

    except Exception as e:
        logger.error("daily brief error: %s", e)
        return {"status": "error", "detail": str(e)}


# ── APScheduler integration ────────────────────────────────────────────────────

async def producer_daily_summary() -> dict:
    """23:30 BKK — สรุปผู้ผลิตที่ลงทะเบียนวันนี้ ส่ง Slack + LINE"""
    try:
        from db import AsyncSessionLocal, Producer
        from sqlalchemy import select, func
        from datetime import date

        today = date.today()
        async with AsyncSessionLocal() as db:
            # ผู้ผลิตวันนี้
            res = await db.execute(
                select(Producer).where(
                    func.date(Producer.created_at) == today
                ).order_by(Producer.created_at.desc())
            )
            today_producers = res.scalars().all()

            # สถิติรวม
            stats_res = await db.execute(
                select(Producer.status, func.count().label("cnt")).group_by(Producer.status)
            )
            stats = {row.status: row.cnt for row in stats_res.all()}
            total_res = await db.execute(select(func.count(Producer.id)))
            total = total_res.scalar() or 0

        msg = (
            f"\n{'━'*24}"
            f"\n🏭 PRODUCER DAILY SUMMARY"
            f"\n{datetime.now().strftime('%d/%m/%Y %H:%M')} BKK"
            f"\n{'━'*24}"
            f"\n\n📊 ยอดรวมทั้งหมด: {total} ราย"
            f"\n⏳ รอติดต่อ: {stats.get('pending', 0)}"
            f"\n📞 ติดต่อแล้ว: {stats.get('contacted', 0)}"
            f"\n✅ Onboard แล้ว: {stats.get('onboarded', 0)}"
            f"\n\n🆕 ลงทะเบียนวันนี้: {len(today_producers)} ราย"
        )
        if today_producers:
            msg += "\n" + "\n".join(
                f"  • {p.company_name} ({p.category}) — {p.contact_phone}"
                for p in today_producers[:10]
            )
        msg += f"\n\n🔗 https://www.openthai-ai.com/producer/admin"

        await notify_mythos(msg)

        # Slack
        slack = os.getenv("STARTUP_SLACK_WEBHOOK") or os.getenv("SLACK_WEBHOOK_URL")
        if slack:
            slack_msg = (
                f"🏭 *Producer Daily Summary — {datetime.now().strftime('%d/%m/%Y')}*\n"
                f"📊 รวม: *{total}* ราย | วันนี้: *{len(today_producers)}* ราย\n"
                f"⏳ Pending: {stats.get('pending',0)} | ✅ Onboarded: {stats.get('onboarded',0)}\n"
                f"🔗 <https://www.openthai-ai.com/producer/admin|เปิด Admin Dashboard>"
            )
            async with __import__("httpx").AsyncClient() as client:
                await client.post(slack, json={"text": slack_msg}, timeout=5)

        return {"status": "sent", "today": len(today_producers), "total": total}
    except Exception as e:
        logger.error("producer_daily_summary error: %s", e)
        return {"status": "error", "detail": str(e)}


def register_mythos_jobs(scheduler) -> None:
    """เพิ่ม Mythos jobs เข้า scheduler ที่มีอยู่"""
    try:
        from apscheduler.triggers.cron import CronTrigger
        scheduler.add_job(
            generate_daily_brief,
            CronTrigger(hour=8, minute=0, timezone="Asia/Bangkok"),
            id="mythos_daily_brief",
            replace_existing=True,
        )
        scheduler.add_job(
            producer_daily_summary,
            CronTrigger(hour=23, minute=30, timezone="Asia/Bangkok"),
            id="producer_daily_summary",
            replace_existing=True,
        )
        logger.info("Mythos daily brief @08:00 + Producer summary @23:30 BKK scheduled")
    except Exception as e:
        logger.warning("Mythos scheduler error: %s", e)
