#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mock TSA Server — สำหรับทดสอบ local เท่านั้น (ห้ามใช้ใน Production)

Endpoint: POST /tsr
Environment variables:
  MODE=granted   (default) → HTTP 200 + dummy granted bytes
  MODE=rejected             → HTTP 200 + dummy rejected bytes (PKIStatus=2)
  MODE=http500              → HTTP 500
  PORT=18080     (default)

ใช้งาน:
  MODE=granted python tools/mock_tsa_server.py
  MODE=rejected python tools/mock_tsa_server.py
  MODE=http500  python tools/mock_tsa_server.py

แล้วทดสอบด้วย:
  python scripts/stamp_and_verify.py \
    --xml docs/etax_output/SAMPLE-INV-2568-001-signed.xml \
    --tsa http://127.0.0.1:18080/tsr
"""

import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


# Minimal DER sequences ตาม RFC 3161 PKIStatusInfo
# PKIStatus=0 (granted): SEQUENCE { INTEGER 0 }
_GRANTED_BYTES  = b"\x30\x03\x02\x01\x00"
# PKIStatus=2 (rejection): SEQUENCE { INTEGER 2 }
_REJECTED_BYTES = b"\x30\x03\x02\x01\x02"


class MockTSAHandler(BaseHTTPRequestHandler):
    """Minimal RFC 3161 mock — ตอบ byte sequence ตาม MODE"""

    def do_POST(self) -> None:
        if self.path != "/tsr":
            self.send_error(404, "Only /tsr is supported")
            return

        # อ่าน request body (ไม่ใช้ใน mock)
        content_length = int(self.headers.get("Content-Length", "0"))
        _ = self.rfile.read(content_length)

        mode = os.getenv("MODE", "granted").lower()

        if mode == "http500":
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"[MOCK] Simulated Internal Server Error")
            self._log(500, mode)
            return

        payload = _REJECTED_BYTES if mode == "rejected" else _GRANTED_BYTES

        self.send_response(200)
        self.send_header("Content-Type", "application/timestamp-reply")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
        self._log(200, mode)

    def _log(self, status: int, mode: str) -> None:
        print(f"[MOCK TSA] {self.command} {self.path} → HTTP {status} (MODE={mode})",
              flush=True)

    def log_message(self, fmt, *args):
        pass  # ปิด default Apache-style log


if __name__ == "__main__":
    port = int(os.getenv("PORT", "18080"))
    mode = os.getenv("MODE", "granted")
    print(f"[MOCK TSA] เริ่มต้นที่ http://127.0.0.1:{port}/tsr  MODE={mode}")
    print(f"[MOCK TSA] หยุดด้วย Ctrl+C")
    try:
        HTTPServer(("127.0.0.1", port), MockTSAHandler).serve_forever()
    except KeyboardInterrupt:
        print("\n[MOCK TSA] หยุดแล้ว")
        sys.exit(0)
