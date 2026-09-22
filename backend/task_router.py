"""
OpenThai AI — AI Task Router 24/7
รับข้อความจาก LINE OA / Email / Web Form / GitHub
→ Claude AI วิเคราะห์ → จัดทีมงาน → LINE Notify อัตโนมัติ

แผนก:
  dev      → Dev/Tech (bugs, deploy, feature)
  sales    → Sales/Marketing (leads, affiliate, pricing)
  support  → Support/CS (help, complaints, how-to)
  finance  → Finance/Payment (payment, refund, billing)
"""

import os
import json
import logging
import secrets
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional
import anthropic
import httpx

logger = logging.getLogger("openthai.tasks")

# ── Department registry ────────────────────────────────────────────────────────

DEPARTMENTS = {
    "dev": {
        "label": "👨‍💻 Dev / Tech",
        "emoji": "🔧",
        "keywords": ["bug", "error", "crash", "api", "deploy", "feature", "code",
                     "ไม่ทำงาน", "พัง", "error", "ฟีเจอร์", "ระบบ", "backend", "frontend"],
        "line_token_env": "LINE_NOTIFY_DEV",
        "email_env": "EMAIL_DEV",
    },
    "sales": {
        "label": "📈 Sales / Marketing",
        "emoji": "💼",
        "keywords": ["ราคา", "price", "affiliate", "ตัวแทน", "commission", "สมัคร",
                     "partner", "lead", "โปรโมชั่น", "ส่วนลด", "discount"],
        "line_token_env": "LINE_NOTIFY_SALES",
        "email_env": "EMAIL_SALES",
    },
    "support": {
        "label": "🎧 Support / CS",
        "emoji": "💬",
        "keywords": ["ช่วย", "help", "ไม่เข้าใจ", "วิธี", "how to", "สอน",
                     "ปัญหา", "ร้องเรียน", "complaint", "ใช้งาน", "account"],
        "line_token_env": "LINE_NOTIFY_SUPPORT",
        "email_env": "EMAIL_SUPPORT",
    },
    "finance": {
        "label": "💰 Finance / Payment",
        "emoji": "💳",
        "keywords": ["จ่าย", "payment", "ชำระ", "invoice", "คืนเงิน", "refund",
                     "billing", "subscription", "ค่าธรรมเนียม", "โอนเงิน", "สลิป"],
        "line_token_env": "LINE_NOTIFY_FINANCE",
        "email_env": "EMAIL_FINANCE",
    },
}

PRIORITY_COLORS = {
    "urgent": "🔴",
    "high":   "🟠",
    "normal": "🟡",
    "low":    "🟢",
}

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

# ── AI Classifier ──────────────────────────────────────────────────────────────

CLASSIFY_PROMPT = """คุณคือ AI Task Router ของ OpenThai AI
วิเคราะห์ข้อความที่ได้รับและจัดหมวดหมู่ให้ทีมงานที่เหมาะสม

แผนกที่มี:
- dev: ปัญหาเทคนิค, bug, การ deploy, ฟีเจอร์ใหม่, API
- sales: inquiry ราคา, affiliate, lead ใหม่, การตลาด, partnership
- support: ขอความช่วยเหลือ, วิธีใช้งาน, ร้องเรียน, บัญชีผู้ใช้
- finance: การชำระเงิน, refund, invoice, subscription, สลิปโอนเงิน

ระดับความเร่งด่วน:
- urgent: ระบบล่ม, ข้อมูลรั่ว, ชำระเงินค้าง >1,000฿, ร้องเรียนรุนแรง
- high: ปัญหาหลัก, ลูกค้าใหม่สนใจมาก, bug กระทบหลายคน
- normal: คำถามทั่วไป, feature request, inquiry ปกติ
- low: feedback ทั่วไป, ข้อเสนอแนะ

ตอบเป็น JSON เท่านั้น ไม่มี markdown:
{
  "department": "dev|sales|support|finance",
  "priority": "urgent|high|normal|low",
  "summary": "สรุป 1 ประโยค ภาษาไทย",
  "action": "สิ่งที่ทีมงานต้องทำ เป็นภาษาไทย",
  "confidence": 0.0-1.0
}"""


async def classify_message(content: str, source: str, sender: str = "") -> dict:
    """ใช้ Claude วิเคราะห์ข้อความ → routing decision"""
    try:
        prompt = f"""แหล่งที่มา: {source}
ผู้ส่ง: {sender or 'ไม่ระบุ'}
ข้อความ:
{content[:2000]}

วิเคราะห์และจัดหมวดหมู่ตามคำสั่ง"""

        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system=CLASSIFY_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
        # Validate fields
        if result.get("department") not in DEPARTMENTS:
            result["department"] = _keyword_fallback(content)
        if result.get("priority") not in ("urgent", "high", "normal", "low"):
            result["priority"] = "normal"
        return result
    except Exception as e:
        logger.warning("classify_message error: %s — using fallback", e)
        return {
            "department": _keyword_fallback(content),
            "priority": "normal",
            "summary": content[:100],
            "action": "ตรวจสอบและดำเนินการ",
            "confidence": 0.5,
        }


def _keyword_fallback(content: str) -> str:
    """Keyword-based fallback when AI is unavailable"""
    content_lower = content.lower()
    scores = {dept: 0 for dept in DEPARTMENTS}
    for dept, info in DEPARTMENTS.items():
        for kw in info["keywords"]:
            if kw in content_lower:
                scores[dept] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "support"


# ── LINE Notify sender ─────────────────────────────────────────────────────────

async def send_team_line_notify(department: str, message: str) -> bool:
    token_env = DEPARTMENTS[department]["line_token_env"]
    token = os.getenv(token_env, "")
    if not token:
        logger.info("[LINE-DEV] dept=%s msg=%s", department, message[:80])
        return False
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(
                "https://notify-api.line.me/api/notify",
                headers={"Authorization": f"Bearer {token}"},
                data={"message": message},
                timeout=10,
            )
            ok = r.status_code == 200
            if not ok:
                logger.warning("LINE Notify dept=%s status=%s", department, r.status_code)
            return ok
    except Exception as e:
        logger.error("LINE Notify error dept=%s: %s", department, e)
        return False


def build_line_message(task_id: str, source: str, sender: str, result: dict, content: str) -> str:
    dept = DEPARTMENTS[result["department"]]
    prio_icon = PRIORITY_COLORS.get(result["priority"], "🟡")
    return (
        f"\n━━━━━━━━━━━━━━━━━━━━"
        f"\n{dept['emoji']} งานใหม่ — {dept['label']}"
        f"\n━━━━━━━━━━━━━━━━━━━━"
        f"\n🆔 Task: {task_id}"
        f"\n{prio_icon} ความเร่งด่วน: {result['priority'].upper()}"
        f"\n📥 แหล่งที่มา: {source}"
        f"\n👤 ผู้ส่ง: {sender or 'ไม่ระบุ'}"
        f"\n📋 สรุป: {result['summary']}"
        f"\n✅ ต้องทำ: {result['action']}"
        f"\n💬 ข้อความ:\n{content[:300]}"
        f"\n━━━━━━━━━━━━━━━━━━━━"
        f"\n🔗 ดูทั้งหมด: https://www.openthai-ai.com/tasks"
    )


# ── Main router ────────────────────────────────────────────────────────────────

async def route_message(
    source: str,
    content: str,
    sender: str = "",
    source_ref: str = "",
) -> dict:
    """
    รับข้อความ → AI classify → บันทึก DB → LINE Notify ทีมที่เกี่ยวข้อง
    Returns task dict
    """
    if not content.strip():
        return {"status": "skipped", "reason": "empty content"}

    # AI classify
    result = await classify_message(content, source, sender)

    # Generate task ID
    task_id = "TASK-" + datetime.now().strftime("%y%m%d") + secrets.token_hex(2).upper()

    # Save to DB
    try:
        from db import AsyncSessionLocal, AutoTask
        async with AsyncSessionLocal() as db:
            task = AutoTask(
                task_id=task_id,
                source=source,
                source_ref=source_ref,
                raw_content=content[:3000],
                sender=sender,
                department=result["department"],
                priority=result["priority"],
                summary=result["summary"],
                action=result["action"],
                status="open",
            )
            db.add(task)
            await db.commit()
    except Exception as e:
        logger.warning("DB save task error: %s", e)

    # LINE Notify
    line_msg = build_line_message(task_id, source, sender, result, content)
    notified = await send_team_line_notify(result["department"], line_msg)

    # Also notify urgent tasks to all teams
    if result["priority"] == "urgent":
        all_token = os.getenv("LINE_NOTIFY_ALL", "")
        if all_token:
            urgent_msg = f"\n🚨 URGENT TASK {task_id}\n{result['summary']}\n→ ทีม {DEPARTMENTS[result['department']]['label']}"
            await send_team_line_notify("dev", urgent_msg)  # broadcast

    if notified:
        try:
            from db import AsyncSessionLocal, AutoTask
            from sqlalchemy import select
            async with AsyncSessionLocal() as db:
                res = await db.execute(select(AutoTask).where(AutoTask.task_id == task_id))
                t = res.scalar_one_or_none()
                if t:
                    t.notified_line = True
                    await db.commit()
        except Exception:
            pass

    logger.info("task routed | id=%s | dept=%s | priority=%s | source=%s",
                task_id, result["department"], result["priority"], source)

    return {
        "task_id": task_id,
        "department": result["department"],
        "department_label": DEPARTMENTS[result["department"]]["label"],
        "priority": result["priority"],
        "summary": result["summary"],
        "action": result["action"],
        "confidence": result.get("confidence", 1.0),
        "notified_line": notified,
        "status": "created",
    }


# ── LINE OA Webhook validator ──────────────────────────────────────────────────

def verify_line_signature(body: bytes, signature: str) -> bool:
    secret = os.getenv("LINE_OA_CHANNEL_SECRET", "")
    if not secret:
        return True  # dev mode — skip validation
    mac = hmac.new(secret.encode(), body, hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected, signature)


# ── GitHub Webhook validator ───────────────────────────────────────────────────

def verify_github_signature(body: bytes, signature: str) -> bool:
    secret = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    if not secret:
        return True
    mac = hmac.new(secret.encode(), body, hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected, signature)


def parse_github_event(event_type: str, payload: dict) -> Optional[dict]:
    """Parse GitHub webhook payload → (content, sender)"""
    try:
        sender = payload.get("sender", {}).get("login", "")
        repo = payload.get("repository", {}).get("full_name", "")

        if event_type == "issues":
            action = payload.get("action", "")
            if action not in ("opened", "reopened"):
                return None
            issue = payload.get("issue", {})
            content = f"[GitHub Issue] {issue.get('title', '')}\n\n{issue.get('body', '')}\nURL: {issue.get('html_url', '')}"
            return {"content": content, "sender": f"{sender} ({repo})"}

        if event_type == "issue_comment":
            comment = payload.get("comment", {})
            issue = payload.get("issue", {})
            content = f"[GitHub Comment] Issue: {issue.get('title', '')}\n\nComment:\n{comment.get('body', '')}\nURL: {comment.get('html_url', '')}"
            return {"content": content, "sender": f"{sender} ({repo})"}

        if event_type == "pull_request":
            action = payload.get("action", "")
            if action not in ("opened", "review_requested"):
                return None
            pr = payload.get("pull_request", {})
            content = f"[GitHub PR] {pr.get('title', '')}\n\n{pr.get('body', '')}\nURL: {pr.get('html_url', '')}"
            return {"content": content, "sender": f"{sender} ({repo})"}

    except Exception as e:
        logger.warning("parse_github_event error: %s", e)
    return None
