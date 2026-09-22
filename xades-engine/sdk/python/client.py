"""OpenThai eTax Verifier — Python SDK Client

ใช้งานง่าย 3 บรรทัด:
    from client import ETaxVerifier
    v = ETaxVerifier("http://localhost:8080")
    result = v.verify_file("invoice.xml")

รองรับ: XAdES-BES / EPES / T / A, batch, revocation, streaming
"""
from __future__ import annotations

import base64
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("[ETaxVerifier] กรุณาติดตั้ง requests: pip install requests", file=sys.stderr)


@dataclass
class VerifyResult:
    """ผลการตรวจสอบลายมือชื่ออิเล็กทรอนิกส์"""
    document_id: str
    is_valid: bool
    xades_profile: str          # XAdES-BES | EPES | T | A
    status: str                 # SUCCESS | VERIFICATION_FAILED | INTERNAL_ERROR
    errors: List[str]
    revocation_status: str      # GOOD | REVOKED | UNDETERMINED | SKIPPED
    raw: dict

    @property
    def passed(self) -> bool:
        return self.is_valid and self.status == "SUCCESS"

    def __str__(self) -> str:
        mark = "✅" if self.passed else "❌"
        return (
            f"{mark} {self.document_id} — {self.xades_profile} "
            f"({'ผ่าน' if self.passed else 'ไม่ผ่าน'})"
            + (f"\n   ข้อผิดพลาด: {', '.join(self.errors)}" if self.errors else "")
        )


class ETaxVerifier:
    """Client สำหรับเชื่อมต่อ OpenThai XAdES Verification API

    Args:
        api_url: URL ของ API server (default: http://localhost:8080)
        timeout: timeout ต่อคำขอ (วินาที)
        check_revocation: เปิดตรวจ OCSP/CRL (ต้องการ network เข้า CA/ETDA)
    """

    def __init__(
        self,
        api_url: str = "http://localhost:8080",
        timeout: int = 30,
        check_revocation: bool = False,
    ) -> None:
        self.api_url = api_url.rstrip("/")
        self.timeout = timeout
        self.check_revocation = check_revocation

    # ─── Single document ──────────────────────────────────────

    def verify_bytes(
        self,
        xml_bytes: bytes,
        document_id: str = "INV-UNKNOWN",
        require_timestamp: bool = False,
    ) -> VerifyResult:
        """ตรวจสอบ XAdES XML จาก bytes"""
        if not HAS_REQUESTS:
            raise RuntimeError("กรุณาติดตั้ง requests: pip install requests")

        payload = {
            "document_id": document_id,
            "xml_base64": base64.b64encode(xml_bytes).decode(),
            "require_timestamp": require_timestamp,
            "check_revocation": self.check_revocation,
        }
        resp = requests.post(
            f"{self.api_url}/api/v1/verify",
            json=payload,
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return self._parse_response(resp.json())

    def verify_file(
        self,
        path: str | Path,
        document_id: Optional[str] = None,
        require_timestamp: bool = False,
    ) -> VerifyResult:
        """ตรวจสอบ XAdES XML จากไฟล์"""
        p = Path(path)
        doc_id = document_id or p.stem
        return self.verify_bytes(p.read_bytes(), doc_id, require_timestamp)

    # ─── Batch ────────────────────────────────────────────────

    def verify_batch(
        self,
        documents: List[dict],  # [{"document_id": "...", "xml_bytes": b"..."}]
        require_timestamp: bool = False,
        max_workers: int = 8,
    ) -> List[VerifyResult]:
        """ตรวจสอบหลายใบพร้อมกัน (parallel)

        Args:
            documents: รายการ dict ที่มี keys: document_id, xml_bytes
            max_workers: จำนวน thread สูงสุดที่รันพร้อมกัน
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed

        def _verify_one(doc: dict) -> VerifyResult:
            return self.verify_bytes(
                doc["xml_bytes"],
                doc.get("document_id", "UNKNOWN"),
                require_timestamp,
            )

        results: List[VerifyResult] = []
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {pool.submit(_verify_one, doc): doc for doc in documents}
            for future in as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as exc:
                    doc = futures[future]
                    results.append(VerifyResult(
                        document_id=doc.get("document_id", "UNKNOWN"),
                        is_valid=False,
                        xades_profile="UNKNOWN",
                        status="INTERNAL_ERROR",
                        errors=[str(exc)],
                        revocation_status="SKIPPED",
                        raw={"error": str(exc)},
                    ))
        return results

    def verify_directory(
        self,
        directory: str | Path,
        pattern: str = "*.xml",
        require_timestamp: bool = False,
    ) -> List[VerifyResult]:
        """ตรวจสอบ XML ทุกไฟล์ในโฟลเดอร์"""
        files = list(Path(directory).glob(pattern))
        docs = [{"document_id": f.stem, "xml_bytes": f.read_bytes()} for f in files]
        return self.verify_batch(docs, require_timestamp)

    # ─── Health ───────────────────────────────────────────────

    def health(self) -> dict:
        """ตรวจสอบสถานะ API server"""
        resp = requests.get(f"{self.api_url}/health", timeout=5)
        resp.raise_for_status()
        return resp.json()

    def is_available(self) -> bool:
        """True ถ้า API server พร้อมใช้งาน"""
        try:
            return self.health().get("status") == "UP"
        except Exception:
            return False

    # ─── Internal ─────────────────────────────────────────────

    def _parse_response(self, data: dict) -> VerifyResult:
        details = data.get("verification_details", {})
        errors = details.get("errors", [])
        revoc = details.get("revocation", {}) or {}
        return VerifyResult(
            document_id=data.get("document_id", "UNKNOWN"),
            is_valid=data.get("is_valid", False),
            xades_profile=data.get("xades_profile", "UNKNOWN"),
            status=data.get("status", "UNKNOWN"),
            errors=errors if isinstance(errors, list) else [str(errors)],
            revocation_status=revoc.get("status", "SKIPPED"),
            raw=data,
        )


# ─── CLI สำหรับทดสอบเร็ว ──────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="OpenThai eTax Verifier CLI")
    parser.add_argument("files", nargs="*", help="XML files หรือ directory")
    parser.add_argument("--api", default="http://localhost:8080", help="API URL")
    parser.add_argument("--revocation", action="store_true", help="เปิด OCSP/CRL check")
    parser.add_argument("--require-ts", action="store_true", help="บังคับ XAdES-T")
    args = parser.parse_args()

    v = ETaxVerifier(args.api, check_revocation=args.revocation)

    if not v.is_available():
        print(f"❌ API ไม่พร้อม: {args.api}")
        sys.exit(1)

    print(f"✅ API พร้อม — {v.health().get('engine_version', '?')}")

    results = []
    for f in args.files:
        p = Path(f)
        if p.is_dir():
            results.extend(v.verify_directory(p, require_timestamp=args.require_ts))
        else:
            results.append(v.verify_file(p, require_timestamp=args.require_ts))

    passed = sum(1 for r in results if r.passed)
    for r in results:
        print(r)

    print(f"\nสรุป: ผ่าน {passed}/{len(results)} ใบ")
    sys.exit(0 if passed == len(results) else 1)
