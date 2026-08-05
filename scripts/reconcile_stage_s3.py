#!/usr/bin/env python3
"""
Stage S3 — Reconciler
กรมสรรพากร e-Tax Invoice & e-Receipt

Reads the local ledger produced by run_stage_s3_batch.py, queries the RD
status-check endpoint for every non-terminal document, and updates the ledger.
Also re-queues ERROR documents that haven't exceeded MAX_RETRIES.

Usage:
    python3 scripts/reconcile_stage_s3.py                   # mock (ledger from ./etax_ledger.json)
    python3 scripts/reconcile_stage_s3.py --live            # real RD query
    python3 scripts/reconcile_stage_s3.py --ledger <file>   # custom ledger path
    python3 scripts/reconcile_stage_s3.py --requeue         # also trigger run_stage_s3_batch for ERRORs

Env vars (live mode):
    RD_ENDPOINT, RD_CLIENT_CERT, RD_CLIENT_KEY, RD_CA_BUNDLE, RD_AUTH_TOKEN

Exit codes:
    0 = all documents terminal (SUBMITTED / DUPLICATE / FAILED)
    1 = some documents still non-terminal (re-run needed)
    2 = configuration error
"""

import os
import sys
import ssl
import json
import time
import threading
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ARGS         = sys.argv[1:]
MOCK_MODE    = "--mock" in ARGS or ("--live" not in ARGS and not os.getenv("RD_ENDPOINT", ""))
MAX_WORKERS  = int(os.getenv("S3_MAX_WORKERS", "4"))
MAX_RETRIES  = int(os.getenv("S3_MAX_RETRIES", "3"))

RD_ENDPOINT  = os.getenv("RD_ENDPOINT", "")
CLIENT_CERT  = os.getenv("RD_CLIENT_CERT", "")
CLIENT_KEY   = os.getenv("RD_CLIENT_KEY", "")
CA_BUNDLE    = os.getenv("RD_CA_BUNDLE", "")
AUTH_TOKEN   = os.getenv("RD_AUTH_TOKEN", "")

STATUS_PATH  = "/etax/document/status"   # adjust when RD publishes final path

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
DIM    = "\033[2m"
RESET  = "\033[0m"

_mu = threading.Lock()

TERMINAL_STATES = {"SUBMITTED", "DUPLICATE", "FAILED"}


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _log(level: str, msg: str) -> None:
    color = {"OK": GREEN, "ERR": RED, "WARN": YELLOW, "INFO": CYAN}.get(level, "")
    with _mu:
        print(f"{color}[{level:4s}]{RESET} {_ts()} {msg}")


# ---------------------------------------------------------------------------
# Ledger (same format as run_stage_s3_batch)
# ---------------------------------------------------------------------------

class Ledger:
    def __init__(self, path: Path) -> None:
        self.path = path
        if not path.exists():
            _log("ERR", f"Ledger not found: {path}")
            sys.exit(2)
        self._data: dict[str, dict] = json.loads(path.read_text())

    def all_records(self) -> list[dict]:
        return list(self._data.values())

    def non_terminal(self) -> list[dict]:
        return [r for r in self._data.values() if r.get("status") not in TERMINAL_STATES]

    def upsert(self, key: str, **fields) -> None:
        with _mu:
            rec = self._data.setdefault(key, {})
            rec.update(fields)
            rec["updated_at"] = _ts()
            self.path.write_text(json.dumps(self._data, indent=2, ensure_ascii=False))

    def summary(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for rec in self._data.values():
            s = rec.get("status", "UNKNOWN")
            counts[s] = counts.get(s, 0) + 1
        return counts


# ---------------------------------------------------------------------------
# RD status query (live)
# ---------------------------------------------------------------------------

_ssl_ctx: ssl.SSLContext | None = None


def _get_ssl_context() -> ssl.SSLContext:
    global _ssl_ctx
    if _ssl_ctx is None:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_3
        if CA_BUNDLE:
            ctx.load_verify_locations(cafile=CA_BUNDLE)
        else:
            ctx.load_default_certs()
        ctx.load_cert_chain(certfile=CLIENT_CERT, keyfile=CLIENT_KEY)
        ctx.verify_mode = ssl.CERT_REQUIRED
        _ssl_ctx = ctx
    return _ssl_ctx


def _query_status(sender_tax_id: str, document_number: str) -> tuple[str, str]:
    """Returns (rd_status, rd_ref). rd_status is uppercase RD state string."""
    if MOCK_MODE:
        # Simulate: ERROR docs become SUBMITTED; PENDING stays PENDING
        return ("ACCEPTED", f"RD-MOCK-RECONCILED-{document_number[:8]}")

    url = RD_ENDPOINT.rstrip("/") + STATUS_PATH
    params = f"?sender_tax_id={sender_tax_id}&document_number={document_number}"
    req = urllib.request.Request(url + params, method="GET")
    req.add_header("Accept", "application/json")
    if AUTH_TOKEN:
        req.add_header("Authorization", f"Bearer {AUTH_TOKEN}")
    ctx = _get_ssl_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            data = json.loads(resp.read())
            status = (data.get("status") or "UNKNOWN").upper()
            ref    = data.get("reference_id") or ""
            return status, ref
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return "NOT_FOUND", ""
        return f"HTTP_{exc.code}", ""
    except Exception as exc:
        return "QUERY_ERROR", str(exc)


# ---------------------------------------------------------------------------
# Reconcile one record
# ---------------------------------------------------------------------------

_ACK_TO_LEDGER = {
    "ACCEPTED": "SUBMITTED",
    "DUPLICATE": "DUPLICATE",
    "REJECTED":  "FAILED",
    "NOT_FOUND": "PENDING",      # RD doesn't know it — treat as un-submitted
}


def _reconcile_one(rec: dict, ledger: Ledger, counters: dict) -> None:
    sid    = rec["sender_tax_id"]
    docnum = rec["document_number"]
    key    = f"{sid}::{docnum}"
    old    = rec.get("status", "UNKNOWN")

    rd_status, ref = _query_status(sid, docnum)

    new_status = _ACK_TO_LEDGER.get(rd_status, old)   # unknown rd statuses → keep old

    if new_status == old and not ref:
        _log("INFO", f"UNCHANGED doc={docnum}  status={old}")
        with _mu:
            counters["unchanged"] += 1
        return

    ledger.upsert(key, status=new_status, rd_ref=ref, rd_query_status=rd_status)

    if new_status in TERMINAL_STATES:
        _log("OK",   f"RESOLVED doc={docnum}  {old}→{new_status}  ref={ref or '—'}")
        with _mu:
            counters["resolved"] += 1
    elif new_status == "PENDING" and old == "ERROR" and rec.get("retries", 0) < MAX_RETRIES:
        _log("WARN", f"REQUEUE  doc={docnum}  {old}→{new_status}  retries={rec.get('retries',0)}")
        with _mu:
            counters["requeued"] += 1
    else:
        _log("WARN", f"STILL_OPEN doc={docnum}  status={new_status}  rd_status={rd_status}")
        with _mu:
            counters["open"] += 1


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    ledger_path = Path(
        next((ARGS[i + 1] for i, a in enumerate(ARGS) if a == "--ledger" and i + 1 < len(ARGS)),
             "etax_ledger.json")
    )

    if not MOCK_MODE:
        for var, val in [("RD_ENDPOINT", RD_ENDPOINT), ("RD_CLIENT_CERT", CLIENT_CERT),
                         ("RD_CLIENT_KEY", CLIENT_KEY)]:
            if not val:
                print(f"[ERR] {var} not set — cannot run live", file=sys.stderr)
                sys.exit(2)

    mode = f"{YELLOW}MOCK{RESET}" if MOCK_MODE else f"{GREEN}LIVE{RESET}"
    _log("INFO", f"S3 reconcile start — mode={mode}  ledger={ledger_path}")

    ledger  = Ledger(ledger_path)
    pending = ledger.non_terminal()
    _log("INFO", f"{len(pending)} non-terminal record(s) to reconcile  (ledger total: {len(ledger.all_records())})")

    if not pending:
        _log("INFO", "All documents are in terminal states — nothing to do")
        _print_summary(ledger)
        sys.exit(0)

    counters = {"resolved": 0, "requeued": 0, "unchanged": 0, "open": 0}

    threads = []
    for rec in pending:
        t = threading.Thread(target=_reconcile_one, args=(rec, ledger, counters))
        threads.append(t)
        if len(threads) >= MAX_WORKERS:
            for th in threads:
                th.start()
            for th in threads:
                th.join()
            threads = []

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    _print_summary(ledger)

    still_open = ledger.non_terminal()
    if not still_open:
        print(f"\n{GREEN}S3 RECONCILE PASS{RESET} — all documents in terminal state")
        sys.exit(0)
    else:
        print(f"\n{YELLOW}S3 RECONCILE INCOMPLETE{RESET} — {len(still_open)} document(s) still non-terminal")
        if "--requeue" in ARGS:
            _log("INFO", "Re-running run_stage_s3_batch.py for non-terminal documents …")
            import subprocess
            subprocess.run(
                [sys.executable, "scripts/run_stage_s3_batch.py",
                 "--ledger", str(ledger_path),
                 *(["--live"] if not MOCK_MODE else [])],
                check=False,
            )
        sys.exit(1)


def _print_summary(ledger: Ledger) -> None:
    summary = ledger.summary()
    print()
    print("─" * 50)
    print("  Ledger summary:")
    for state, count in sorted(summary.items()):
        color = GREEN if state in ("SUBMITTED", "DUPLICATE") else (RED if state == "FAILED" else YELLOW)
        print(f"    {color}{state:12s}{RESET} {count}")
    print("─" * 50)


if __name__ == "__main__":
    main()
