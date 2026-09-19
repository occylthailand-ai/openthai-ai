#!/usr/bin/env python3
"""
Stage S1 — mTLS connectivity test (TLS 1.3)
กรมสรรพากร e-Tax Invoice API

Usage:
    python3 scripts/test_stage_s1_mtls.py            # mock mode (no certs)
    python3 scripts/test_stage_s1_mtls.py --live      # real RD endpoint

Env vars (live mode):
    RD_ENDPOINT      Base URL of RD API gateway
    RD_CLIENT_CERT   Path to client .pem certificate
    RD_CLIENT_KEY    Path to client .key file
    RD_CA_BUNDLE     Path to RD CA bundle (or system default)
"""

import os
import sys
import ssl
import json
import time
import socket
import urllib.request
import urllib.error
from datetime import datetime, timezone

MOCK_MODE = "--live" not in sys.argv

RD_ENDPOINT  = os.getenv("RD_ENDPOINT", "")
CLIENT_CERT  = os.getenv("RD_CLIENT_CERT", "")
CLIENT_KEY   = os.getenv("RD_CLIENT_KEY", "")
CA_BUNDLE    = os.getenv("RD_CA_BUNDLE", "")

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ok(label: str, detail: str = "") -> None:
    suffix = f" — {detail}" if detail else ""
    print(f"{GREEN}[PASS]{RESET} {label}{suffix}")


def _fail(label: str, detail: str = "") -> None:
    suffix = f" — {detail}" if detail else ""
    print(f"{RED}[FAIL]{RESET} {label}{suffix}")


def _info(msg: str) -> None:
    print(f"{YELLOW}[INFO]{RESET} {msg}")


def _check_env() -> bool:
    missing = []
    for var, val in [("RD_ENDPOINT", RD_ENDPOINT), ("RD_CLIENT_CERT", CLIENT_CERT), ("RD_CLIENT_KEY", CLIENT_KEY)]:
        if not val:
            missing.append(var)
    if missing:
        _fail("Environment variables", f"missing: {', '.join(missing)}")
        return False
    _ok("Environment variables", f"RD_ENDPOINT={RD_ENDPOINT}")
    return True


def _check_cert_files() -> bool:
    ok = True
    for path, label in [(CLIENT_CERT, "CLIENT_CERT"), (CLIENT_KEY, "CLIENT_KEY")]:
        if not os.path.isfile(path):
            _fail(f"File exists: {label}", path)
            ok = False
        else:
            _ok(f"File exists: {label}", path)
    if CA_BUNDLE and not os.path.isfile(CA_BUNDLE):
        _fail("File exists: CA_BUNDLE", CA_BUNDLE)
        ok = False
    elif CA_BUNDLE:
        _ok("File exists: CA_BUNDLE", CA_BUNDLE)
    return ok


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


def _check_tls_version(ctx: ssl.SSLContext) -> bool:
    parsed = urllib.parse.urlparse(RD_ENDPOINT) if RD_ENDPOINT else None
    host = parsed.hostname if parsed else None
    port = parsed.port or 443 if parsed else 443
    try:
        with socket.create_connection((host, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                ver = ssock.version()
                if ver == "TLSv1.3":
                    _ok("TLS version", ver)
                    return True
                else:
                    _fail("TLS version", f"expected TLSv1.3, got {ver}")
                    return False
    except Exception as exc:
        _fail("TLS handshake", str(exc))
        return False


def _check_ping(ctx: ssl.SSLContext) -> bool:
    url = RD_ENDPOINT.rstrip("/") + "/health"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Accept", "application/json")
    try:
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            elapsed = (time.perf_counter() - t0) * 1000
            status = resp.status
            body = resp.read(256)
            if status in (200, 204):
                _ok("API ping", f"HTTP {status} in {elapsed:.0f}ms")
                return True
            else:
                _fail("API ping", f"HTTP {status}: {body[:80]}")
                return False
    except urllib.error.HTTPError as exc:
        _fail("API ping", f"HTTP {exc.code}: {exc.reason}")
        return False
    except Exception as exc:
        _fail("API ping", str(exc))
        return False


# ---------------------------------------------------------------------------
# Mock path
# ---------------------------------------------------------------------------

def _run_mock() -> None:
    _info(f"Mock mode — no certs required (timestamp: {_ts()})")
    print()

    results = {
        "environment_variables": True,
        "cert_files_exist": True,
        "tls_1_3_handshake": True,
        "api_ping_200": True,
    }

    _ok("Environment variables", "mock — skipped")
    _ok("File exists: CLIENT_CERT", "mock — skipped")
    _ok("File exists: CLIENT_KEY",  "mock — skipped")
    _ok("TLS version", "TLSv1.3 (simulated)")
    _ok("API ping", "HTTP 200 in 42ms (simulated)")

    print()
    _print_summary(results, mock=True)


# ---------------------------------------------------------------------------
# Live path
# ---------------------------------------------------------------------------

import urllib.parse  # noqa: E402 (moved import for readability)


def _run_live() -> None:
    _info(f"Live mode — RD endpoint: {RD_ENDPOINT} (timestamp: {_ts()})")
    print()

    results = {}

    results["environment_variables"] = _check_env()
    if not results["environment_variables"]:
        _print_summary(results)
        sys.exit(1)

    results["cert_files_exist"] = _check_cert_files()
    if not results["cert_files_exist"]:
        _print_summary(results)
        sys.exit(1)

    try:
        ctx = _build_ssl_context()
        _ok("SSL context built", "TLS 1.3 minimum enforced")
    except Exception as exc:
        _fail("SSL context", str(exc))
        results["tls_1_3_handshake"] = False
        results["api_ping_200"] = False
        _print_summary(results)
        sys.exit(1)

    results["tls_1_3_handshake"] = _check_tls_version(ctx)
    results["api_ping_200"] = _check_ping(ctx)

    print()
    _print_summary(results)

    if not all(results.values()):
        sys.exit(1)


def _print_summary(results: dict, mock: bool = False) -> None:
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    label = "(mock)" if mock else "(live)"
    print("─" * 50)
    if passed == total:
        print(f"{GREEN}S1 PASS{RESET} {label} — {passed}/{total} checks passed")
    else:
        failed_keys = [k for k, v in results.items() if not v]
        print(f"{RED}S1 FAIL{RESET} {label} — {passed}/{total} checks passed")
        print(f"  Failed: {', '.join(failed_keys)}")
    print("─" * 50)


if __name__ == "__main__":
    if MOCK_MODE:
        _run_mock()
    else:
        _run_live()
