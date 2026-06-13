"""
OpenThai AI — Setup Validator
ตรวจสอบ environment variables และ connectivity ทั้ง 4 integration
"""
import os
import asyncio
import logging
import httpx

logger = logging.getLogger("openthai.setup")

CHECKS = {
    "anthropic": {
        "label": "🤖 Anthropic API (Claude)",
        "required": True,
        "envs": ["ANTHROPIC_API_KEY"],
    },
    "line_notify_dev": {
        "label": "🔧 LINE Notify — Dev Team",
        "required": False,
        "envs": ["LINE_NOTIFY_DEV"],
    },
    "line_notify_sales": {
        "label": "💼 LINE Notify — Sales Team",
        "required": False,
        "envs": ["LINE_NOTIFY_SALES"],
    },
    "line_notify_support": {
        "label": "🎧 LINE Notify — Support Team",
        "required": False,
        "envs": ["LINE_NOTIFY_SUPPORT"],
    },
    "line_notify_finance": {
        "label": "💰 LINE Notify — Finance Team",
        "required": False,
        "envs": ["LINE_NOTIFY_FINANCE"],
    },
    "line_oa": {
        "label": "💬 LINE OA Webhook",
        "required": False,
        "envs": ["LINE_OA_CHANNEL_SECRET", "LINE_OA_CHANNEL_TOKEN"],
    },
    "github_webhook": {
        "label": "🐙 GitHub Webhook",
        "required": False,
        "envs": ["GITHUB_WEBHOOK_SECRET"],
    },
    "promptpay": {
        "label": "💳 PromptPay QR",
        "required": False,
        "envs": ["PROMPTPAY_ID"],
    },
    "smtp": {
        "label": "📧 Email (SMTP)",
        "required": False,
        "envs": ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
    },
    "news_digest": {
        "label": "📡 News Digest Email",
        "required": False,
        "envs": ["NEWS_DIGEST_EMAIL"],
    },
}


async def ping_line_notify(token: str) -> bool:
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(
                "https://notify-api.line.me/api/status",
                headers={"Authorization": f"Bearer {token}"},
                timeout=8,
            )
            return r.status_code == 200
    except Exception:
        return False


async def run_setup_check() -> dict:
    results = {}
    for key, info in CHECKS.items():
        env_vals = {e: os.getenv(e, "") for e in info["envs"]}
        all_set = all(bool(v) for v in env_vals.values())

        status = "ok" if all_set else ("missing_required" if info["required"] else "not_configured")
        live = None

        # Live ping for LINE Notify tokens
        if all_set and key.startswith("line_notify_"):
            token = list(env_vals.values())[0]
            live = await ping_line_notify(token)
            if not live:
                status = "token_invalid"

        results[key] = {
            "label": info["label"],
            "required": info["required"],
            "status": status,        # ok | missing_required | not_configured | token_invalid
            "configured": all_set,
            "live": live,
            "envs": {e: ("✅ set" if v else "❌ missing") for e, v in env_vals.items()},
        }

    configured = sum(1 for r in results.values() if r["configured"])
    total = len(results)
    score = int(configured / total * 100)

    return {
        "score": score,
        "configured": configured,
        "total": total,
        "checks": results,
        "ready_for_production": results["anthropic"]["status"] == "ok",
    }
