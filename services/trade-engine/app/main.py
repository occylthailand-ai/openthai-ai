"""OpenThai AI v14 — Trade Intelligence Engine (FastAPI).

Enhanced: API-key auth · per-IP rate limiting · structured JSON logging · health.

รัน local:
    cd services/trade-engine
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import json
import logging
import sys
import time
from collections import defaultdict, deque

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import get_settings
from .ingestion.entity_resolution import EntityResolver
from .ingestion.v14_advanced_pipeline import run_pipeline
from .schemas import IngestRequest, IngestResponse

settings = get_settings()


# ── Structured JSON logging ──────────────────────────────────────────────────
class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler], force=True)
log = logging.getLogger("trade-engine")


# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="OpenThai AI v14 — Trade Intelligence Engine",
    version=settings.version,
    description="Unified trade-data ingestion · entity resolution · knowledge graph",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not settings.is_production else ["https://www.openthai-ai.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Per-IP rate limiting (sliding window, in-memory) ─────────────────────────
_hits: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    # health ไม่นับ rate limit เพื่อให้ probe ได้เสมอ
    if request.url.path == "/health":
        return await call_next(request)
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = _hits[ip]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= settings.rate_limit_per_min:
        log.warning("rate limit exceeded for %s", ip)
        return JSONResponse(status_code=429, content={"detail": "rate limit exceeded"})
    window.append(now)
    start = time.time()
    resp = await call_next(request)
    log.info("%s %s -> %s (%.0fms)", request.method, request.url.path,
             resp.status_code, (time.time() - start) * 1000)
    return resp


# ── API-key auth dependency ──────────────────────────────────────────────────
def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    # ถ้าไม่ได้ตั้ง API_KEY ใน env (dev) → เปิดให้ใช้ได้ แต่เตือน
    if not settings.api_key:
        log.warning("API_KEY ไม่ได้ตั้งค่า — endpoint เปิดโดยไม่ auth (dev only)")
        return
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="invalid or missing X-API-Key")


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "trade-engine",
        "version": settings.version,
        "env": settings.env,
        "auth_enabled": bool(settings.api_key),
        "rate_limit_per_min": settings.rate_limit_per_min,
    }


@app.post("/api/v1/trade/ingest", response_model=IngestResponse,
          dependencies=[Depends(require_api_key)])
def ingest(req: IngestRequest) -> IngestResponse:
    """รับ trade records (normalize แล้ว) → resolve entity → เขียน knowledge graph."""
    resolver = EntityResolver()

    # เลือก graph writer: ใช้ Neo4j จริงถ้าตั้งค่าไว้ ไม่งั้น dry-run
    graph_writer = None
    if settings.neo4j_password:
        try:
            from .core.neo4j_client import session, upsert_shipment

            def graph_writer(params: dict) -> int:  # noqa: F811
                with session() as s:
                    return upsert_shipment(s, params)
        except Exception as e:  # noqa: BLE001
            log.error("เชื่อมต่อ Neo4j ไม่ได้ ใช้ dry-run แทน: %s", e)

    if graph_writer is None:
        result = run_pipeline(req.records, resolver=resolver, clean_with_llm=req.clean_with_llm)
    else:
        result = run_pipeline(req.records, resolver=resolver,
                              graph_writer=graph_writer, clean_with_llm=req.clean_with_llm)
    log.info("ingest done: accepted=%d resolved=%d", result.accepted, result.resolved_entities)
    return result
