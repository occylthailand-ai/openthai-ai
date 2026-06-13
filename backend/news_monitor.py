"""
OpenThai AI — News Monitor 24/7
ติดตามข่าว AI จาก 10+ แหล่งอัตโนมัติ ทุก 30 นาที
- บันทึกใน DB
- แจ้งเตือน LINE Notify (เฉพาะข่าวสำคัญ)
- ส่ง Email digest รายวัน (08:00 น.)
- เปิดดูผ่าน /news API
"""

import os
import asyncio
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
import xml.etree.ElementTree as ET

logger = logging.getLogger("openthai.news")

# ── Feed registry ─────────────────────────────────────────────────────────────

FEEDS = [
    # Priority 3 — Anthropic (notify LINE immediately)
    {"source": "anthropic",  "label": "Anthropic Blog",     "emoji": "🤖", "priority": 3,
     "url": "https://www.anthropic.com/rss.xml"},

    # Priority 2 — Major AI labs
    {"source": "openai",     "label": "OpenAI Blog",        "emoji": "⚡", "priority": 2,
     "url": "https://openai.com/blog/rss.xml"},
    {"source": "google_ai",  "label": "Google AI Blog",     "emoji": "🔵", "priority": 2,
     "url": "https://blog.google/technology/ai/rss/"},
    {"source": "deepmind",   "label": "Google DeepMind",    "emoji": "🧬", "priority": 2,
     "url": "https://deepmind.google/blog/rss.xml"},
    {"source": "meta_ai",    "label": "Meta AI Blog",       "emoji": "📘", "priority": 2,
     "url": "https://ai.meta.com/blog/feed/"},
    {"source": "huggingface","label": "Hugging Face Blog",  "emoji": "🤗", "priority": 2,
     "url": "https://huggingface.co/blog/feed.xml"},

    # Priority 1 — AI news & TikTok
    {"source": "techcrunch", "label": "TechCrunch AI",      "emoji": "📡", "priority": 1,
     "url": "https://techcrunch.com/category/artificial-intelligence/feed/"},
    {"source": "theverge",   "label": "The Verge AI",       "emoji": "🔺", "priority": 1,
     "url": "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml"},
    {"source": "venturebeat","label": "VentureBeat AI",     "emoji": "💡", "priority": 1,
     "url": "https://venturebeat.com/category/ai/feed/"},
    {"source": "mit_review", "label": "MIT Tech Review",    "emoji": "🎓", "priority": 1,
     "url": "https://www.technologyreview.com/feed/"},
    {"source": "blognone",   "label": "Blognone (ไทย)",     "emoji": "🇹🇭", "priority": 2,
     "url": "https://www.blognone.com/node/feed"},
    {"source": "beartai",    "label": "Beartai (ไทย)",      "emoji": "🇹🇭", "priority": 1,
     "url": "https://www.beartai.com/feed"},
    {"source": "tiktok_news","label": "TikTok Newsroom",    "emoji": "🎵", "priority": 2,
     "url": "https://newsroom.tiktok.com/feed"},
]

NS = {"atom": "http://www.w3.org/2005/Atom"}

# ── RSS / Atom parser ─────────────────────────────────────────────────────────

def _parse_date(s: str) -> datetime:
    """Parse RSS/Atom date → UTC datetime."""
    if not s:
        return datetime.now(timezone.utc)
    fmts = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
    ]
    for fmt in fmts:
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            continue
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _strip_html(text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", text or "").strip()[:500]


def _parse_feed_xml(xml_text: str, feed_info: dict) -> list[dict]:
    """Parse RSS 2.0 or Atom feed XML → list of article dicts."""
    articles = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return articles

    # Atom feed
    atom_ns = "http://www.w3.org/2005/Atom"
    if root.tag == f"{{{atom_ns}}}feed" or root.tag == "feed":
        for entry in root.findall(f"{{{atom_ns}}}entry") or root.findall("entry"):
            title_el = entry.find(f"{{{atom_ns}}}title") or entry.find("title")
            link_el = entry.find(f"{{{atom_ns}}}link") or entry.find("link")
            summary_el = entry.find(f"{{{atom_ns}}}summary") or entry.find("summary") or entry.find(f"{{{atom_ns}}}content") or entry.find("content")
            pub_el = entry.find(f"{{{atom_ns}}}published") or entry.find("published") or entry.find(f"{{{atom_ns}}}updated") or entry.find("updated")

            title = title_el.text if title_el is not None else ""
            url = (link_el.get("href") or link_el.text) if link_el is not None else ""
            summary = _strip_html(summary_el.text if summary_el is not None else "")
            pub_date = _parse_date(pub_el.text if pub_el is not None else "")

            if title and url:
                articles.append({"title": title.strip(), "url": url.strip(), "summary": summary, "published_at": pub_date})
        return articles

    # RSS 2.0 feed
    channel = root.find("channel")
    items = (channel or root).findall("item")
    for item in items:
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description")
        pub_el = item.find("pubDate") or item.find("dc:date")

        title = title_el.text if title_el is not None else ""
        url = link_el.text if link_el is not None else ""
        summary = _strip_html(desc_el.text if desc_el is not None else "")
        pub_date = _parse_date(pub_el.text if pub_el is not None else "")

        if title and url:
            articles.append({"title": title.strip(), "url": url.strip(), "summary": summary, "published_at": pub_date})
    return articles


# ── Fetch single feed ─────────────────────────────────────────────────────────

async def fetch_feed(feed_info: dict, client: httpx.AsyncClient) -> list[dict]:
    try:
        r = await client.get(feed_info["url"], timeout=15, follow_redirects=True)
        if r.status_code != 200:
            logger.warning("feed=%s status=%s", feed_info["source"], r.status_code)
            return []
        articles = _parse_feed_xml(r.text, feed_info)
        logger.info("feed=%s fetched=%d articles", feed_info["source"], len(articles))
        return articles
    except Exception as e:
        logger.warning("feed=%s error=%s", feed_info["source"], e)
        return []


# ── Save to DB ────────────────────────────────────────────────────────────────

async def save_articles(feed_info: dict, articles: list[dict]) -> list:
    """Save new articles to DB. Returns list of newly-inserted articles."""
    try:
        from db import AsyncSessionLocal, NewsArticle
        from sqlalchemy import select
    except ImportError:
        return []

    new_articles = []
    async with AsyncSessionLocal() as db:
        for a in articles:
            try:
                exists = await db.execute(
                    select(NewsArticle).where(NewsArticle.url == a["url"])
                )
                if exists.scalar_one_or_none():
                    continue
                article = NewsArticle(
                    source=feed_info["source"],
                    source_label=feed_info["label"],
                    source_emoji=feed_info["emoji"],
                    title=a["title"],
                    url=a["url"],
                    summary=a.get("summary", ""),
                    published_at=a["published_at"],
                    priority=feed_info["priority"],
                )
                db.add(article)
                await db.flush()
                new_articles.append({"source": feed_info["source"], "label": feed_info["label"],
                                     "emoji": feed_info["emoji"], "title": a["title"],
                                     "url": a["url"], "priority": feed_info["priority"]})
            except Exception as e:
                logger.debug("save skip: %s", e)
        try:
            await db.commit()
        except Exception as e:
            logger.warning("commit error: %s", e)
    return new_articles


# ── LINE Notify ───────────────────────────────────────────────────────────────

async def send_line_notify(message: str) -> bool:
    token = os.getenv("LINE_NOTIFY_TOKEN", "")
    if not token:
        logger.info("[LINE-DEV] %s", message[:100])
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://notify-api.line.me/api/notify",
                headers={"Authorization": f"Bearer {token}"},
                data={"message": message},
                timeout=10,
            )
            return r.status_code == 200
    except Exception as e:
        logger.error("LINE Notify error: %s", e)
        return False


async def notify_new_articles(new_articles: list[dict]) -> None:
    """Send LINE notification for priority articles."""
    # Priority 3 = notify immediately, Priority 2 = batch, Priority 1 = digest only
    priority3 = [a for a in new_articles if a["priority"] >= 3]
    priority2 = [a for a in new_articles if a["priority"] == 2]

    for a in priority3:
        msg = f"\n🚨 ข่าวด่วน {a['emoji']} {a['label']}\n📰 {a['title']}\n🔗 {a['url']}"
        await send_line_notify(msg)

    if priority2:
        titles = "\n".join(f"  {a['emoji']} {a['title'][:60]}" for a in priority2[:5])
        msg = f"\n🤖 ข่าว AI ใหม่ {len(priority2)} รายการ\n{titles}"
        await send_line_notify(msg)

    # Mark as notified in DB
    if new_articles:
        try:
            from db import AsyncSessionLocal, NewsArticle
            from sqlalchemy import select
            urls = [a["url"] for a in new_articles if a["priority"] >= 2]
            if urls:
                async with AsyncSessionLocal() as db:
                    res = await db.execute(select(NewsArticle).where(NewsArticle.url.in_(urls)))
                    for article in res.scalars().all():
                        article.is_notified_line = True
                    await db.commit()
        except Exception as e:
            logger.warning("mark notified error: %s", e)


# ── Email Digest ──────────────────────────────────────────────────────────────

async def send_daily_digest() -> None:
    """ส่ง email digest ข่าว AI ประจำวัน"""
    digest_to = os.getenv("NEWS_DIGEST_EMAIL", "")
    if not digest_to:
        logger.info("NEWS_DIGEST_EMAIL not set — skipping digest")
        return

    try:
        from db import AsyncSessionLocal, NewsArticle
        from sqlalchemy import select
        yesterday = datetime.utcnow() - timedelta(hours=24)
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(NewsArticle)
                .where(NewsArticle.fetched_at >= yesterday, NewsArticle.is_in_digest == False)
                .order_by(NewsArticle.priority.desc(), NewsArticle.published_at.desc())
                .limit(30)
            )
            articles = res.scalars().all()

        if not articles:
            logger.info("No new articles for digest")
            return

        # Group by source
        by_source: dict = {}
        for a in articles:
            by_source.setdefault(a.source_label, []).append(a)

        rows = ""
        for label, arts in by_source.items():
            rows += f"<tr><td colspan='2' style='background:#f0f4ff;padding:8px;font-weight:700;color:#1a1a2e;border-radius:4px;'>{arts[0].source_emoji} {label}</td></tr>"
            for a in arts[:5]:
                rows += f"<tr><td style='padding:6px 8px;'>📰 <a href='{a.url}' style='color:#FF6B35;text-decoration:none;'>{a.title}</a></td><td style='padding:6px;color:#888;font-size:0.82rem;white-space:nowrap;'>{a.published_at.strftime('%d/%m %H:%M')}</td></tr>"

        html = f"""
        <div style="font-family:'Noto Sans Thai',Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1A1A2E,#0F3460);color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:1.5rem;">🇹🇭 OpenThai AI — Daily AI Digest</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:0.9rem;">{datetime.utcnow().strftime('%d %B %Y')} · {len(articles)} ข่าวใหม่</p>
          </div>
          <div style="background:white;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;">
            <table style="width:100%;border-collapse:collapse;">{rows}</table>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
            <p style="text-align:center;color:#888;font-size:0.8rem;">
              <a href="https://www.openthai-ai.com" style="color:#FF6B35;">openthai-ai.com</a> ·
              <a href="https://www.openthai-ai.com/?unsubscribe=1" style="color:#888;">ยกเลิก</a>
            </p>
          </div>
        </div>
        """

        from email_utils import _send
        await _send(digest_to, f"🤖 AI News Digest {datetime.utcnow().strftime('%d/%m/%Y')} — {len(articles)} ข่าวใหม่", html)

        # Mark as in digest
        async with AsyncSessionLocal() as db:
            ids = [a.id for a in articles]
            res = await db.execute(select(NewsArticle).where(NewsArticle.id.in_(ids)))
            for art in res.scalars().all():
                art.is_in_digest = True
            await db.commit()

        logger.info("Digest sent to %s with %d articles", digest_to, len(articles))

    except Exception as e:
        logger.error("Digest error: %s", e)


# ── Main fetch job ─────────────────────────────────────────────────────────────

async def run_news_fetch() -> dict:
    """Fetch all feeds, save new articles, send notifications. Returns summary."""
    logger.info("News fetch started — %d feeds", len(FEEDS))
    total_new = 0
    all_new = []

    async with httpx.AsyncClient(
        headers={"User-Agent": "OpenThaiAI-NewsBot/1.0 (+https://www.openthai-ai.com)"},
        timeout=15.0,
    ) as client:
        tasks = [fetch_feed(f, client) for f in FEEDS]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    for feed_info, articles in zip(FEEDS, results):
        if isinstance(articles, Exception) or not articles:
            continue
        new = await save_articles(feed_info, articles)
        total_new += len(new)
        all_new.extend(new)

    if all_new:
        await notify_new_articles(all_new)

    logger.info("News fetch done — %d new articles", total_new)
    return {"fetched": total_new, "new_articles": all_new[:10]}


# ── APScheduler ───────────────────────────────────────────────────────────────

_scheduler = None


def start_scheduler() -> None:
    """Start APScheduler in background. Call once at app startup."""
    global _scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger

        _scheduler = AsyncIOScheduler(timezone="Asia/Bangkok")

        # Fetch news every 30 minutes
        _scheduler.add_job(run_news_fetch, IntervalTrigger(minutes=30), id="news_fetch",
                           replace_existing=True, misfire_grace_time=60)

        # Daily digest at 08:00 Bangkok time
        _scheduler.add_job(send_daily_digest, CronTrigger(hour=8, minute=0, timezone="Asia/Bangkok"),
                           id="daily_digest", replace_existing=True)

        _scheduler.start()
        logger.info("News scheduler started — fetch every 30 min, digest at 08:00")
    except ImportError:
        logger.warning("APScheduler not installed — news scheduler disabled")
    except Exception as e:
        logger.error("Scheduler start error: %s", e)


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("News scheduler stopped")


# expose for external registration (Mythos, etc.)
@property
def scheduler(self=None):
    return _scheduler

# simple module-level accessor
def get_scheduler():
    return _scheduler
