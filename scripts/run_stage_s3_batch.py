#!/usr/bin/env python3
"""
Stage S3 — Concurrent batch submission with idempotency guard
กรมสรรพากร e-Tax Invoice & e-Receipt API

Reads a queue of XML files from a directory (or a JSON manifest), submits
them in parallel using a bounded worker pool, tracks per-document state in a
local JSON ledger, and exits non-zero if any document ends in a terminal
failure.

Usage:
    python3 scripts/run_stage_s3_batch.py [options]

Options:
    --dir <path>          Directory of .xml files (default: ./etax_queue)
    --manifest <file>     JSON manifest [{"path": "...", ...}, ...] — overrides --dir
    --workers <n>         Max concurrent workers (default: $S3_MAX_WORKERS or 4)
    --ledger <file>       State ledger path (default: ./etax_ledger.json)
    --mock                Force mock mode (no real HTTP calls)
    --live                Require live mode (fail if certs missing)

Env vars (live mode):
    RD_ENDPOINT, RD_CLIENT_CERT, RD_CLIENT_KEY, RD_CA_BUNDLE
    RD_SENDER_TAX_ID, RD_AUTH_TOKEN
    S3_MAX_WORKERS        (int, default 4)

Ledger document states:
    PENDING     → not yet submitted this run
    SUBMITTED   → ACK'd ACCEPTED by RD (terminal — never resubmit)
    DUPLICATE   → RD returned DUPLICATE (treated as success)
    FAILED      → terminal rejection by RD (not retried automatically)
    ERROR       → network/transient error (retried next run up to S3_MAX_RETRIES)

Exit codes:
    0 = all documents SUBMITTED or DUPLICATE
    1 = at least one FAILED or ERROR after exhausting retries
    2 = configuration error
"""

import os
import sys
import ssl
import json
import base64
import hashlib
import time
import uuid
import threading
import queue
import xml.etree.ElementTree as ET
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MAX_WORKERS   = int(os.getenv("S3_MAX_WORKERS", "4"))
MAX_RETRIES   = int(os.getenv("S3_MAX_RETRIES", "3"))
BACKOFF_BASE  = float(os.getenv("S3_BACKOFF_BASE", "2.0"))   # seconds

RD_ENDPOINT   = os.getenv("RD_ENDPOINT", "")
CLIENT_CERT   = os.getenv("RD_CLIENT_CERT", "")
CLIENT_KEY    = os.getenv("RD_CLIENT_KEY", "")
CA_BUNDLE     = os.getenv("RD_CA_BUNDLE", "")
SENDER_TAX_ID = os.getenv("RD_SENDER_TAX_ID", "")
AUTH_TOKEN    = os.getenv("RD_AUTH_TOKEN", "")

SUBMIT_PATH   = "/etax/document/submit"

ARGS          = sys.argv[1:]
MOCK_MODE     = "--mock" in ARGS or ("--live" not in ARGS and not RD_ENDPOINT)

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
DIM    = "\033[2m"
RESET  = "\033[0m"

_lock = threading.Lock()


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _log(level: str, msg: str) -> None:
    color = {"OK": GREEN, "ERR": RED, "WARN": YELLOW, "INFO": CYAN}.get(level, "")
    with _lock:
        print(f"{color}[{level:4s}]{RESET} {_ts()} {msg}")


# ---------------------------------------------------------------------------
# Ledger (idempotency store)
# ---------------------------------------------------------------------------

class Ledger:
    """Thread-safe JSON ledger. Key = (sender_tax_id, document_number)."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._data: dict[str, dict] = {}
        self._mu = threading.Lock()
        if path.exists():
            self._data = json.loads(path.read_text())

    def _key(self, sender_tax_id: str, document_number: str) -> str:
        return f"{sender_tax_id}::{document_number}"

    def is_terminal(self, sender_tax_id: str, document_number: str) -> bool:
        with self._mu:
            rec = self._data.get(self._key(sender_tax_id, document_number), {})
            return rec.get("status") in ("SUBMITTED", "DUPLICATE", "FAILED")

    def retry_count(self, sender_tax_id: str, document_number: str) -> int:
        with self._mu:
            return self._data.get(self._key(sender_tax_id, document_number), {}).get("retries", 0)

    def upsert(self, sender_tax_id: str, document_number: str, **fields) -> None:
        with self._mu:
            k = self._key(sender_tax_id, document_number)
            rec = self._data.setdefault(k, {"sender_tax_id": sender_tax_id, "document_number": document_number})
            rec.update(fields)
            rec["updated_at"] = _ts()
            self.path.write_text(json.dumps(self._data, indent=2, ensure_ascii=False))

    def summary(self) -> dict[str, int]:
        with self._mu:
            counts: dict[str, int] = {}
            for rec in self._data.values():
                s = rec.get("status", "UNKNOWN")
                counts[s] = counts.get(s, 0) + 1
            return counts


# ---------------------------------------------------------------------------
# XML / payload helpers (mirrors S2)
# ---------------------------------------------------------------------------

def _extract_meta(xml_bytes: bytes) -> dict:
    try:
        root = ET.fromstring(xml_bytes)
        ns   = {"cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"}
        return {
            "document_number": root.findtext(".//cbc:ID", namespaces=ns) or str(uuid.uuid4()),
            "issue_date":      root.findtext(".//cbc:IssueDate", namespaces=ns) or _ts()[:10],
            "sender_tax_id":   root.findtext(".//cbc:CompanyID", namespaces=ns) or SENDER_TAX_ID,
        }
    except ET.ParseError:
        return {"document_number": str(uuid.uuid4()), "issue_date": _ts()[:10], "sender_tax_id": SENDER_TAX_ID}


def _build_payload(xml_bytes: bytes, meta: dict) -> dict:
    return {
        "submission_id":   str(uuid.uuid4()),
        "sender_tax_id":   meta["sender_tax_id"],
        "document_number": meta["document_number"],
        "issue_date":      meta["issue_date"],
        "document_type":   "380",
        "document":        base64.b64encode(xml_bytes).decode(),
        "document_hash":   base64.b64encode(hashlib.sha256(xml_bytes).digest()).decode(),
        "submitted_at":    _ts(),
    }


def _parse_ack(body: bytes) -> tuple[str, str]:
    try:
        data   = json.loads(body)
        status = (data.get("status") or data.get("result") or "UNKNOWN").upper()
        ref    = data.get("reference_id") or data.get("ref") or ""
        return status, ref
    except Exception:
        return "UNKNOWN", ""


# ---------------------------------------------------------------------------
# HTTP (live)
# ---------------------------------------------------------------------------

_ssl_ctx: ssl.SSLContext | None = None


def _get_ssl_context() -> ssl.SSLContext:
    global _ssl_ctx
    if _ssl_ctx is None:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_3
        ctx.maximum_version = ssl.TLSVersion.TLSv1_3
        if CA_BUNDLE:
            ctx.load_verify_locations(cafile=CA_BUNDLE)
        else:
            ctx.load_default_certs()
        ctx.load_cert_chain(certfile=CLIENT_CERT, keyfile=CLIENT_KEY)
        ctx.verify_mode = ssl.CERT_REQUIRED
        _ssl_ctx = ctx
    return _ssl_ctx


def _http_submit(payload: dict) -> tuple[int, bytes]:
    url  = RD_ENDPOINT.rstrip("/") + SUBMIT_PATH
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("X-Submission-ID", payload["submission_id"])
    if AUTH_TOKEN:
        req.add_header("Authorization", f"Bearer {AUTH_TOKEN}")
    ctx = _get_ssl_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()
    except Exception as exc:
        return 0, str(exc).encode()


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------

def _process_one(item: dict, ledger: Ledger, stats: dict) -> None:
    path     = Path(item["path"])
    xml_bytes = path.read_bytes()
    meta     = _extract_meta(xml_bytes)
    sid      = meta["sender_tax_id"]
    docnum   = meta["document_number"]

    # Idempotency — skip terminal documents
    if ledger.is_terminal(sid, docnum):
        existing = ledger.retry_count(sid, docnum)
        _log("INFO", f"SKIP (terminal) {path.name}  doc={docnum}")
        with _lock:
            stats["skipped"] += 1
        return

    retries = ledger.retry_count(sid, docnum)
    if retries >= MAX_RETRIES:
        _log("ERR", f"EXHAUSTED retries ({retries}) {path.name}  doc={docnum}")
        ledger.upsert(sid, docnum, status="FAILED", retries=retries, path=str(path))
        with _lock:
            stats["failed"] += 1
        return

    payload = _build_payload(xml_bytes, meta)
    ledger.upsert(sid, docnum, status="PENDING", path=str(path))

    for attempt in range(retries, MAX_RETRIES):
        if MOCK_MODE:
            http_code = 200
            body      = json.dumps({"status": "ACCEPTED", "reference_id": f"RD-MOCK-{uuid.uuid4().hex[:8].upper()}"}).encode()
        else:
            http_code, body = _http_submit(payload)

        status, ref = _parse_ack(body)

        if http_code in (200, 201) and status in ("ACCEPTED", "DUPLICATE"):
            final = "SUBMITTED" if status == "ACCEPTED" else "DUPLICATE"
            ledger.upsert(sid, docnum, status=final, rd_ref=ref, retries=attempt)
            _log("OK", f"{final} {path.name}  doc={docnum}  ref={ref}")
            with _lock:
                stats["submitted"] += 1
            return

        if http_code in (400, 422) or status == "REJECTED":
            # Terminal rejection — don't retry
            ledger.upsert(sid, docnum, status="FAILED", retries=attempt, http_code=http_code,
                          rd_status=status, body_preview=body[:200].decode(errors="replace"))
            _log("ERR", f"REJECTED {path.name}  doc={docnum}  HTTP={http_code}  status={status}")
            with _lock:
                stats["failed"] += 1
            return

        # Transient (5xx / timeout / network) — backoff and retry
        delay = BACKOFF_BASE ** attempt
        _log("WARN", f"TRANSIENT attempt={attempt+1}/{MAX_RETRIES} {path.name}  HTTP={http_code}  sleeping {delay:.0f}s")
        ledger.upsert(sid, docnum, status="ERROR", retries=attempt + 1, http_code=http_code)
        time.sleep(delay)

    ledger.upsert(sid, docnum, status="ERROR", retries=MAX_RETRIES)
    _log("ERR", f"GAVE_UP {path.name}  doc={docnum}")
    with _lock:
        stats["failed"] += 1


def _worker(q: queue.Queue, ledger: Ledger, stats: dict) -> None:
    while True:
        try:
            item = q.get_nowait()
        except queue.Empty:
            return
        try:
            _process_one(item, ledger, stats)
        except Exception as exc:
            _log("ERR", f"UNHANDLED {item.get('path','?')}: {exc}")
            with _lock:
                stats["failed"] += 1
        finally:
            q.task_done()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _parse_args() -> tuple[list[dict], Path, int]:
    args = ARGS

    ledger_path = Path(next((args[i + 1] for i, a in enumerate(args) if a == "--ledger" and i + 1 < len(args)), "etax_ledger.json"))
    workers     = int(next((args[i + 1] for i, a in enumerate(args) if a == "--workers" and i + 1 < len(args)), MAX_WORKERS))

    if "--manifest" in args:
        idx      = args.index("--manifest") + 1
        manifest = json.loads(Path(args[idx]).read_text())
        return manifest, ledger_path, workers

    dir_path = Path(next((args[i + 1] for i, a in enumerate(args) if a == "--dir" and i + 1 < len(args)), "etax_queue"))
    if not dir_path.is_dir():
        print(f"Queue directory not found: {dir_path}", file=sys.stderr)
        sys.exit(2)
    items = [{"path": str(p)} for p in sorted(dir_path.glob("*.xml"))]
    return items, ledger_path, workers


def main() -> None:
    items, ledger_path, workers = _parse_args()

    if not items:
        _log("INFO", "No documents to submit — queue is empty")
        sys.exit(0)

    if "--live" in ARGS:
        for var, val in [("RD_ENDPOINT", RD_ENDPOINT), ("RD_CLIENT_CERT", CLIENT_CERT),
                         ("RD_CLIENT_KEY", CLIENT_KEY), ("RD_SENDER_TAX_ID", SENDER_TAX_ID)]:
            if not val:
                print(f"[ERR] {var} not set — cannot run live", file=sys.stderr)
                sys.exit(2)

    mode = f"{YELLOW}MOCK{RESET}" if MOCK_MODE else f"{GREEN}LIVE{RESET}"
    _log("INFO", f"S3 batch start — {len(items)} doc(s) | workers={workers} | mode={mode}")
    _log("INFO", f"ledger={ledger_path}")

    ledger = Ledger(ledger_path)
    stats  = {"submitted": 0, "skipped": 0, "failed": 0}

    q: queue.Queue = queue.Queue()
    for item in items:
        q.put(item)

    threads = []
    for _ in range(min(workers, len(items))):
        t = threading.Thread(target=_worker, args=(q, ledger, stats), daemon=True)
        t.start()
        threads.append(t)
    for t in threads:
        t.join()

    summary = ledger.summary()
    print()
    print("─" * 60)
    print(f"  Submitted (accepted): {GREEN}{stats['submitted']}{RESET}")
    print(f"  Skipped (terminal):   {DIM}{stats['skipped']}{RESET}")
    print(f"  Failed/error:         {RED if stats['failed'] else DIM}{stats['failed']}{RESET}")
    print(f"  Ledger totals:        {json.dumps(summary)}")
    print("─" * 60)

    if stats["failed"] > 0:
        print(f"{RED}S3 FAIL{RESET} — {stats['failed']} document(s) need attention")
        sys.exit(1)
    else:
        print(f"{GREEN}S3 PASS{RESET} — all documents submitted or already terminal")
        sys.exit(0)


if __name__ == "__main__":
    main()
