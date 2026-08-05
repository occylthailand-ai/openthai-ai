#!/usr/bin/env python3
"""
Stage S2 — ยื่น e-Tax Invoice ด้วย XAdES-T (Base64 JSON payload)
กรมสรรพากร e-Tax Invoice & e-Receipt API

Usage:
    python3 scripts/submit_stage_s2_xades.py                      # mock mode
    python3 scripts/submit_stage_s2_xades.py --live <file.xml>    # ยื่นจริง
    python3 scripts/submit_stage_s2_xades.py --live --batch <dir> # ยื่นทุกไฟล์ใน dir

Env vars (live mode):
    RD_ENDPOINT        Base URL of RD submission API
    RD_CLIENT_CERT     Path to client .pem certificate
    RD_CLIENT_KEY      Path to client .key file
    RD_CA_BUNDLE       Path to RD CA bundle (optional)
    RD_SENDER_TAX_ID   13-digit Tax ID of the sender
    RD_AUTH_TOKEN      Bearer token (if RD gateway requires JWT layer)

Exit codes:
    0 = all documents ACK'd (or mock pass)
    1 = at least one document rejected / network error
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
import xml.etree.ElementTree as ET
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

MOCK_MODE = "--live" not in sys.argv

RD_ENDPOINT     = os.getenv("RD_ENDPOINT", "")
CLIENT_CERT     = os.getenv("RD_CLIENT_CERT", "")
CLIENT_KEY      = os.getenv("RD_CLIENT_KEY", "")
CA_BUNDLE       = os.getenv("RD_CA_BUNDLE", "")
SENDER_TAX_ID   = os.getenv("RD_SENDER_TAX_ID", "")
AUTH_TOKEN      = os.getenv("RD_AUTH_TOKEN", "")

SUBMIT_PATH     = "/etax/document/submit"      # adjust when RD publishes final path

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _info(msg: str) -> None:
    print(f"{YELLOW}[INFO]{RESET} {msg}")


def _ok(label: str, detail: str = "") -> None:
    suffix = f" — {detail}" if detail else ""
    print(f"{GREEN}[OK  ]{RESET} {label}{suffix}")


def _err(label: str, detail: str = "") -> None:
    suffix = f" — {detail}" if detail else ""
    print(f"{RED}[ERR ]{RESET} {label}{suffix}")


# ---------------------------------------------------------------------------
# XML helpers
# ---------------------------------------------------------------------------

def _extract_document_meta(xml_bytes: bytes) -> dict:
    """Pull key fields from an e-Tax XML envelope (best-effort)."""
    try:
        root = ET.fromstring(xml_bytes)
        ns = {"inv": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
              "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"}
        doc_num  = root.findtext(".//cbc:ID", namespaces=ns) or ""
        issue_dt = root.findtext(".//cbc:IssueDate", namespaces=ns) or ""
        tax_id   = root.findtext(".//cbc:CompanyID", namespaces=ns) or SENDER_TAX_ID
        return {"document_number": doc_num, "issue_date": issue_dt, "sender_tax_id": tax_id}
    except ET.ParseError:
        return {"document_number": str(uuid.uuid4()), "issue_date": _ts()[:10], "sender_tax_id": SENDER_TAX_ID}


def _sha256_b64(data: bytes) -> str:
    return base64.b64encode(hashlib.sha256(data).digest()).decode()


# ---------------------------------------------------------------------------
# Payload builder
# ---------------------------------------------------------------------------

def _build_payload(xml_bytes: bytes, meta: dict) -> dict:
    """
    RD expects a JSON envelope whose 'document' field is Base64(XAdES-T signed XML).
    Adjust field names once the official spec is published.
    """
    return {
        "submission_id": str(uuid.uuid4()),
        "sender_tax_id": meta["sender_tax_id"],
        "document_number": meta["document_number"],
        "issue_date": meta["issue_date"],
        "document_type": "380",          # UN/EDIFACT: Commercial Invoice
        "document": base64.b64encode(xml_bytes).decode(),
        "document_hash": _sha256_b64(xml_bytes),
        "submitted_at": _ts(),
    }


# ---------------------------------------------------------------------------
# ACK map
# ---------------------------------------------------------------------------

ACK_STATUS_MAP = {
    "ACCEPTED":  ("accepted",  GREEN),
    "REJECTED":  ("rejected",  RED),
    "PENDING":   ("pending",   YELLOW),
    "DUPLICATE": ("duplicate", YELLOW),
}

def _parse_ack(body: bytes) -> tuple[str, str]:
    """Returns (status_label, rd_reference) from RD ACK JSON."""
    try:
        data = json.loads(body)
        status = (data.get("status") or data.get("result") or "UNKNOWN").upper()
        ref    = data.get("reference_id") or data.get("ref") or ""
        return status, ref
    except Exception:
        return "UNKNOWN", ""


# ---------------------------------------------------------------------------
# HTTP submit
# ---------------------------------------------------------------------------

def _build_ssl_context() -> ssl.SSLContext:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_3
    ctx.maximum_version = ssl.TLSVersion.TLSv1_3
    if CA_BUNDLE:
        ctx.load_verify_locations(cafile=CA_BUNDLE)
    else:
        ctx.load_default_certs()
    ctx.load_cert_chain(certfile=CLIENT_CERT, keyfile=CLIENT_KEY)
    ctx.verify_mode = ssl.CERT_REQUIRED
    return ctx


def _submit_one(payload: dict, ctx: ssl.SSLContext) -> tuple[int, bytes]:
    url  = RD_ENDPOINT.rstrip("/") + SUBMIT_PATH
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("X-Submission-ID", payload["submission_id"])
    if AUTH_TOKEN:
        req.add_header("Authorization", f"Bearer {AUTH_TOKEN}")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()
    except Exception as exc:
        return 0, str(exc).encode()


# ---------------------------------------------------------------------------
# Live submit flow
# ---------------------------------------------------------------------------

def _submit_file(path: Path, ctx: ssl.SSLContext) -> bool:
    print(f"\n{CYAN}── {path.name} ──{RESET}")
    xml_bytes = path.read_bytes()
    meta      = _extract_document_meta(xml_bytes)
    _info(f"doc={meta['document_number']}  sender={meta['sender_tax_id']}  date={meta['issue_date']}")

    payload   = _build_payload(xml_bytes, meta)
    http_code, body = _submit_one(payload, ctx)

    if http_code == 0:
        _err("Network", body.decode(errors="replace"))
        return False

    status, ref = _parse_ack(body)
    label, color = ACK_STATUS_MAP.get(status, ("unknown", YELLOW))

    print(f"  HTTP {http_code}  status={color}{status}{RESET}  ref={ref or '—'}")

    if status == "ACCEPTED":
        _ok("Submitted", ref)
        return True
    elif status == "DUPLICATE":
        _ok("Duplicate (already accepted)", ref)
        return True
    else:
        _err("Rejected or unknown ACK", f"status={status} body={body[:120]}")
        return False


def _run_live() -> None:
    args = sys.argv[1:]

    if "--batch" in args:
        idx = args.index("--batch") + 1
        if idx >= len(args):
            print("--batch requires a directory path", file=sys.stderr)
            sys.exit(2)
        batch_dir = Path(args[idx])
        xml_files = sorted(batch_dir.glob("*.xml"))
        if not xml_files:
            _info(f"No .xml files found in {batch_dir}")
            sys.exit(0)
    else:
        non_flag = [a for a in args if not a.startswith("--")]
        if not non_flag:
            print("Provide a .xml file path or use --batch <dir>", file=sys.stderr)
            sys.exit(2)
        xml_files = [Path(non_flag[0])]

    for var, val in [("RD_ENDPOINT", RD_ENDPOINT), ("RD_SENDER_TAX_ID", SENDER_TAX_ID),
                     ("RD_CLIENT_CERT", CLIENT_CERT), ("RD_CLIENT_KEY", CLIENT_KEY)]:
        if not val:
            _err("Config", f"{var} is not set")
            sys.exit(2)

    ctx = _build_ssl_context()

    passed = 0
    failed = 0
    for f in xml_files:
        if _submit_file(f, ctx):
            passed += 1
        else:
            failed += 1

    print()
    print("─" * 50)
    if failed == 0:
        print(f"{GREEN}S2 PASS{RESET} — {passed}/{passed + failed} document(s) accepted")
    else:
        print(f"{RED}S2 FAIL{RESET} — {failed} rejected / errored, {passed} accepted")
    print("─" * 50)

    sys.exit(0 if failed == 0 else 1)


# ---------------------------------------------------------------------------
# Mock path
# ---------------------------------------------------------------------------

_MOCK_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-MOCK-0001</cbc:ID>
  <cbc:IssueDate>2026-08-05</cbc:IssueDate>
  <cbc:CompanyID>1234567890123</cbc:CompanyID>
</Invoice>"""


def _run_mock() -> None:
    _info(f"Mock mode — no network call (timestamp: {_ts()})")
    print()

    meta    = _extract_document_meta(_MOCK_XML)
    payload = _build_payload(_MOCK_XML, meta)
    _info(f"doc={meta['document_number']}  sender={meta['sender_tax_id']}  date={meta['issue_date']}")
    _info(f"submission_id={payload['submission_id']}")
    _info(f"document_hash={payload['document_hash']}")

    # Simulated ACK
    mock_ack = {"status": "ACCEPTED", "reference_id": f"RD-MOCK-{uuid.uuid4().hex[:8].upper()}"}
    status, ref = _parse_ack(json.dumps(mock_ack).encode())
    label, color = ACK_STATUS_MAP.get(status, ("unknown", YELLOW))
    print(f"  HTTP 200  status={color}{status}{RESET}  ref={ref}")
    _ok("Submitted (mock)", ref)

    print()
    print("─" * 50)
    print(f"{GREEN}S2 PASS{RESET} (mock) — 1/1 document accepted")
    print("─" * 50)


if __name__ == "__main__":
    if MOCK_MODE:
        _run_mock()
    else:
        _run_live()
