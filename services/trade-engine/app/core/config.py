"""Centralised configuration — อ่านจาก environment variables (12-factor)."""
import os
from functools import lru_cache


class Settings:
    """Runtime settings. Local dev อ่านจาก docker/.env, production อ่านจาก secret manager."""

    # ── App ──────────────────────────────────────────────────────────────
    env: str = os.getenv("OTAI_ENV", "development")
    version: str = os.getenv("OTAI_VERSION", "14.2.0")

    # ── API security ─────────────────────────────────────────────────────
    api_key: str = os.getenv("API_KEY", "")
    # rate limit ต่อ IP: dev ผ่อนปรน, prod เข้มขึ้น
    rate_limit_per_min: int = int(os.getenv("RATE_LIMIT_PER_MIN", "10" if env == "development" else "100"))

    # ── LLM ──────────────────────────────────────────────────────────────
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    # ใช้รุ่นล่าสุดสำหรับงาน data-cleaning ที่ต้องการความแม่นยำ
    llm_model: str = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001")

    # ── Neo4j ────────────────────────────────────────────────────────────
    neo4j_uri: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user: str = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "")

    # ── Qdrant (vector) ──────────────────────────────────────────────────
    qdrant_host: str = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port: int = int(os.getenv("QDRANT_PORT", "6333"))
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "trade_entities")

    @property
    def is_production(self) -> bool:
        return self.env.lower() in ("production", "prod")


@lru_cache
def get_settings() -> Settings:
    return Settings()
