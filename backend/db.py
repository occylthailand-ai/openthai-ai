"""
Database models — SQLite (dev) / PostgreSQL (prod)
เปลี่ยน DATABASE_URL ใน .env เป็น postgresql+asyncpg://... สำหรับ production
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Float, DateTime, Boolean, Text, UniqueConstraint, Index
from datetime import datetime
import os
import secrets

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./openthai.db")

_is_sqlite = DATABASE_URL.lower().startswith("sqlite")
_engine_kwargs: dict = {"echo": False, "future": True}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
    _engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    _engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


# ── Core auth ─────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    api_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(20), default="free")
    org_id: Mapped[str] = mapped_column(String(50), default="", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApiUsage(Base):
    __tablename__ = "api_usage"
    __table_args__ = (UniqueConstraint("api_key", "date", name="uq_usage_key_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key: Mapped[str] = mapped_column(String(64), index=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    count: Mapped[int] = mapped_column(Integer, default=0)


# ── Data flywheel ─────────────────────────────────────────────────────────────

class ContentGeneration(Base):
    """Every generated piece of content — foundation of the data flywheel."""
    __tablename__ = "content_generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    generation_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    org_id: Mapped[str] = mapped_column(String(50), default="", index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    hook_type: Mapped[str] = mapped_column(String(50), index=True)
    product_name: Mapped[str] = mapped_column(String(255))
    script_hook: Mapped[str] = mapped_column(Text)
    script_story: Mapped[str] = mapped_column(Text)
    script_cta: Mapped[str] = mapped_column(Text)
    caption: Mapped[str] = mapped_column(Text)
    hashtags: Mapped[str] = mapped_column(Text)       # JSON array
    ai_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ContentFeedback(Base):
    """User-submitted performance data — turns into flywheel insights."""
    __tablename__ = "content_feedback"
    __table_args__ = (
        Index("ix_feedback_cat_hook", "category", "hook_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    generation_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    hook_type: Mapped[str] = mapped_column(String(50), index=True)
    views: Mapped[int] = mapped_column(Integer, default=0)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[int] = mapped_column(Integer, default=0)   # 1-5 stars
    did_it_work: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── Trending data ─────────────────────────────────────────────────────────────

class TrendingData(Base):
    """Curated Thai TikTok trending data per category — updated by admin."""
    __tablename__ = "trending_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashtags: Mapped[str] = mapped_column(Text)        # JSON array
    sounds: Mapped[str] = mapped_column(Text)          # JSON array
    best_post_times: Mapped[str] = mapped_column(Text) # JSON array
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── B2B Organizations ─────────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    contact_name: Mapped[str] = mapped_column(String(255))
    contact_email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    contact_phone: Mapped[str] = mapped_column(String(20))
    org_type: Mapped[str] = mapped_column(String(50))  # cooperative, government, agency, enterprise
    plan: Mapped[str] = mapped_column(String(20), default="team")
    max_members: Mapped[int] = mapped_column(Integer, default=5)
    api_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    daily_limit: Mapped[int] = mapped_column(Integer, default=100)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OrgMember(Base):
    __tablename__ = "org_members"
    __table_args__ = (UniqueConstraint("org_id", "user_id", name="uq_org_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[str] = mapped_column(String(50), index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    role: Mapped[str] = mapped_column(String(20), default="member")  # admin, member
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── Commerce ──────────────────────────────────────────────────────────────────

class Affiliate(Base):
    __tablename__ = "affiliates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    seller_type: Mapped[str] = mapped_column(String(50))
    channels: Mapped[str] = mapped_column(Text, default="")
    bank_name: Mapped[str] = mapped_column(String(100))
    bank_account: Mapped[str] = mapped_column(String(50))
    registered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    tier: Mapped[str] = mapped_column(String(20), default="bronze")
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_commission: Mapped[float] = mapped_column(Float, default=0.0)
    pending_commission: Mapped[float] = mapped_column(Float, default=0.0)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(20))
    package: Mapped[str] = mapped_column(String(50))
    price: Mapped[int] = mapped_column(Integer)
    pay_method: Mapped[str] = mapped_column(String(50))
    affiliate_ref: Mapped[str] = mapped_column(String(20), default="")
    user_type: Mapped[str] = mapped_column(String(50), default="")
    status: Mapped[str] = mapped_column(String(50), default="pending_payment")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    paid_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class Commission(Base):
    __tablename__ = "commissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    affiliate_code: Mapped[str] = mapped_column(String(20), index=True)
    order_id: Mapped[str] = mapped_column(String(20), index=True)
    package: Mapped[str] = mapped_column(String(50))
    amount: Mapped[float] = mapped_column(Float)
    commission_rate: Mapped[float] = mapped_column(Float)
    commission_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── Payment slips ─────────────────────────────────────────────────────────────

class PaymentSlip(Base):
    """สลิปโอนเงินที่ลูกค้าอัปโหลด — admin ยืนยันด้วย POST /order/{id}/confirm"""
    __tablename__ = "payment_slips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[str] = mapped_column(String(20), index=True)
    bank_code: Mapped[str] = mapped_column(String(20), default="")
    slip_data: Mapped[str] = mapped_column(Text)   # base64 PNG/JPG
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── Session helpers ───────────────────────────────────────────────────────────

async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


def new_api_key() -> str:
    return "otai_" + secrets.token_urlsafe(32)


def new_org_key() -> str:
    return "org_" + secrets.token_urlsafe(32)


# ── Auto Task Router ─────────────────────────────────────────────────────────

class AutoTask(Base):
    """Task ที่สร้างอัตโนมัติจาก AI Task Router"""
    __tablename__ = "auto_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(30), index=True)       # line, email, form, github
    source_ref: Mapped[str] = mapped_column(String(200), default="")  # message_id, email_id, etc.
    raw_content: Mapped[str] = mapped_column(Text)                     # original message
    sender: Mapped[str] = mapped_column(String(200), default="")       # sender name/email
    department: Mapped[str] = mapped_column(String(20), index=True)   # dev, sales, support, finance
    priority: Mapped[str] = mapped_column(String(10), default="normal") # urgent, high, normal, low
    summary: Mapped[str] = mapped_column(Text)
    action: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)  # open, in_progress, done
    notified_line: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── News Monitor ──────────────────────────────────────────────────────────────

class NewsArticle(Base):
    """ข่าว AI จากทุกแหล่ง — เก็บโดย news_monitor"""
    __tablename__ = "news_articles"
    __table_args__ = (UniqueConstraint("url", name="uq_news_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(50), index=True)        # "anthropic", "openai", etc.
    source_label: Mapped[str] = mapped_column(String(100))              # "Anthropic Blog"
    source_emoji: Mapped[str] = mapped_column(String(10), default="📰")
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(1000), unique=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_notified_line: Mapped[bool] = mapped_column(Boolean, default=False)
    is_in_digest: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, index=True)  # 3=high, 2=mid, 1=normal


# ── Mythos Command System ─────────────────────────────────────────────────────

class MythosDirective(Base):
    """Directive จาก Mythos ระดับ CEO"""
    __tablename__ = "mythos_directives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    directive_id: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    issued_by: Mapped[str] = mapped_column(String(100), default="Mythos")
    raw_text: Mapped[str] = mapped_column(Text)
    context: Mapped[str] = mapped_column(Text, default="")
    summary: Mapped[str] = mapped_column(Text)
    strategic_intent: Mapped[str] = mapped_column(Text)
    urgency: Mapped[str] = mapped_column(String(20), default="normal", index=True)
    success_criteria: Mapped[str] = mapped_column(Text)
    review_date: Mapped[datetime] = mapped_column(DateTime)
    task_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    closed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class ExecutiveTask(Base):
    """งานย่อยที่ AI แตกออกจาก Directive มอบหมายให้ C-Suite/Regional/Dept"""
    __tablename__ = "executive_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    directive_id: Mapped[str] = mapped_column(String(30), index=True)
    assignee: Mapped[str] = mapped_column(String(30), index=True)       # cto, cfo, th_director …
    assignee_title: Mapped[str] = mapped_column(String(100))
    assignee_tier: Mapped[str] = mapped_column(String(20), index=True)  # c_suite, regional, department
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    deliverable: Mapped[str] = mapped_column(Text, default="")
    kpi: Mapped[str] = mapped_column(String(300), default="")
    deadline: Mapped[datetime] = mapped_column(DateTime, index=True)
    depends_on: Mapped[str] = mapped_column(String(200), default="")   # comma-sep exec IDs
    status: Mapped[str] = mapped_column(String(20), default="assigned", index=True)
    progress_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
