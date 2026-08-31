"""
OpenThaiAI — Thai Commercial NER Inference Service
สกัด Entity: จำนวนสินค้า (QTY), หน่วยนับ (UNIT), งบประมาณ (BUDGET)
จากข้อความภาษาไทยที่รับมาจาก LINE OA / Facebook webhook

Endpoints:
    POST /v1/ner/extract   → สกัด entities จากข้อความ
    GET  /healthz           → health check
    GET  /metrics           → Prometheus metrics (port 8080)
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from starlette.responses import Response

logger = logging.getLogger("ner-service")
logging.basicConfig(level=logging.INFO)

# --------------------------------------------------------------------------- #
# Prometheus metrics
# --------------------------------------------------------------------------- #
NER_REQUESTS   = Counter("openthaiai_ner_requests_total",   "Total NER inference requests",
                          ["status"])
NER_LATENCY    = Histogram("openthaiai_ner_duration_seconds", "NER inference latency",
                            buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0])
MODEL_LOADED   = Gauge("openthaiai_ner_model_loaded", "1 if transformer model is loaded, 0 if using mock")

# --------------------------------------------------------------------------- #
# Label definitions — must match dataset/label_schema.json
# --------------------------------------------------------------------------- #
LABEL_LIST = ["O", "B-QTY", "I-QTY", "B-UNIT", "I-UNIT", "B-BUDGET", "I-BUDGET"]
ID2LABEL   = {i: l for i, l in enumerate(LABEL_LIST)}

MODEL_PATH = os.getenv("NER_MODEL_PATH", "./openthaiai-ner-wangchanberta")

# module-level singletons (loaded once on startup)
_tokenizer = None
_model     = None


# --------------------------------------------------------------------------- #
# Lifespan: load model at startup, release at shutdown
# --------------------------------------------------------------------------- #
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _tokenizer, _model
    try:
        from transformers import AutoTokenizer, AutoModelForTokenClassification
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        _model     = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
        _model.eval()
        MODEL_LOADED.set(1)
        logger.info("✅ NER model loaded from %s", MODEL_PATH)
    except Exception as exc:
        MODEL_LOADED.set(0)
        logger.warning("⚠️  Model not found (%s) — running in mock mode", exc)
    yield
    _tokenizer = None
    _model     = None


# --------------------------------------------------------------------------- #
# FastAPI app
# --------------------------------------------------------------------------- #
app = FastAPI(
    title="OpenThaiAI NER Inference Service",
    version="1.0.0",
    description="Thai commercial NER: extract QTY, UNIT, BUDGET from Thai text",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Request / Response schemas
# --------------------------------------------------------------------------- #
class NERRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=512,
                      example="ต้องการบาล์มสมุนไพร 50 กระปุก งบรวม 2,000 บาท")


class EntitySpan(BaseModel):
    entity: str          # QTY | UNIT | BUDGET
    value:  str          # extracted text
    score:  float        # confidence 0–1
    start:  Optional[int] = None   # token start index (word-level)
    end:    Optional[int] = None   # token end index (inclusive)


class NERResponse(BaseModel):
    raw_text:  str
    entities:  list[EntitySpan]
    model_mode: str      # "transformer" | "mock"


# --------------------------------------------------------------------------- #
# Inference helpers
# --------------------------------------------------------------------------- #
def _group_bio_spans(tokens: list[str], tag_ids: list[int],
                     scores: list[float]) -> list[EntitySpan]:
    """Convert BIO tag sequence to entity spans (word-level)."""
    spans: list[EntitySpan] = []
    current_label: str | None = None
    current_tokens: list[str] = []
    current_scores: list[float] = []
    start_idx = 0

    for i, (tok, tag_id, score) in enumerate(zip(tokens, tag_ids, scores)):
        label = ID2LABEL.get(tag_id, "O")
        if label.startswith("B-"):
            if current_label:
                spans.append(EntitySpan(
                    entity=current_label,
                    value=" ".join(current_tokens),
                    score=round(sum(current_scores) / len(current_scores), 4),
                    start=start_idx,
                    end=i - 1,
                ))
            current_label  = label[2:]
            current_tokens = [tok]
            current_scores = [score]
            start_idx = i
        elif label.startswith("I-") and current_label == label[2:]:
            current_tokens.append(tok)
            current_scores.append(score)
        else:
            if current_label:
                spans.append(EntitySpan(
                    entity=current_label,
                    value=" ".join(current_tokens),
                    score=round(sum(current_scores) / len(current_scores), 4),
                    start=start_idx,
                    end=i - 1,
                ))
            current_label  = None
            current_tokens = []
            current_scores = []

    if current_label:
        spans.append(EntitySpan(
            entity=current_label,
            value=" ".join(current_tokens),
            score=round(sum(current_scores) / len(current_scores), 4),
            start=start_idx,
            end=len(tokens) - 1,
        ))

    return spans


def _infer_transformer(text: str) -> list[EntitySpan]:
    import torch
    import torch.nn.functional as F

    # Simple whitespace tokenisation for Thai (production: use newmm/deepcut)
    words = text.split()

    enc = _tokenizer(
        words,
        is_split_into_words=True,
        return_tensors="pt",
        truncation=True,
        max_length=128,
    )

    with torch.no_grad():
        logits = _model(**enc).logits          # (1, seq_len, num_labels)
        probs  = F.softmax(logits, dim=-1)

    pred_ids = logits.argmax(dim=-1)[0].tolist()
    pred_probs = probs[0].max(dim=-1).values.tolist()

    # Map subtoken predictions → word-level (first subtoken wins)
    word_ids   = enc.word_ids(batch_index=0)
    seen       = set()
    word_tags:  list[int]   = []
    word_scores: list[float] = []

    for idx, word_id in enumerate(word_ids):
        if word_id is None or word_id in seen:
            continue
        seen.add(word_id)
        word_tags.append(pred_ids[idx])
        word_scores.append(pred_probs[idx])

    return _group_bio_spans(words, word_tags, word_scores)


def _infer_mock(text: str) -> list[EntitySpan]:
    """Rule-based fallback when the transformer model is not loaded."""
    import re
    spans: list[EntitySpan] = []
    words = text.split()

    qty_pattern    = re.compile(r"^\d+$|^[๐-๙]+$|^(ร้อย|พัน|หมื่น|สิบ|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สอง|สาม)$")
    unit_pattern   = re.compile(r"^(กระปุก|ชิ้น|กล่อง|โหล|ลัง|ขวด|อัน|แพ็ค|ถุง|ก้อน|หลอด|แผ่น|ม้วน|ถาด)$")
    budget_pattern = re.compile(r"^[\d,]+$|^(บาท|THB)$")

    for i, w in enumerate(words):
        if qty_pattern.match(w):
            spans.append(EntitySpan(entity="QTY",    value=w, score=0.75, start=i, end=i))
        elif unit_pattern.match(w):
            spans.append(EntitySpan(entity="UNIT",   value=w, score=0.80, start=i, end=i))
        elif budget_pattern.match(w) and any(c.isdigit() for c in w):
            spans.append(EntitySpan(entity="BUDGET", value=w, score=0.70, start=i, end=i))

    return spans


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@app.get("/healthz")
def health():
    return {"status": "ok", "model_loaded": bool(_model)}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/v1/ner/extract", response_model=NERResponse)
def extract_entities(payload: NERRequest):
    text = payload.text.strip()
    t0 = time.perf_counter()
    mode = "mock"

    try:
        if _model and _tokenizer:
            entities = _infer_transformer(text)
            mode = "transformer"
        else:
            entities = _infer_mock(text)

        NER_REQUESTS.labels(status="success").inc()
        return NERResponse(raw_text=text, entities=entities, model_mode=mode)

    except Exception as exc:
        NER_REQUESTS.labels(status="error").inc()
        logger.error("NER inference failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="NER inference failed") from exc
    finally:
        NER_LATENCY.observe(time.perf_counter() - t0)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")
