#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Wrapper: Stamp XAdES-T แล้วรัน verifier test อัตโนมัติ

ใช้งาน:
  python scripts/stamp_and_verify.py \
    --xml docs/etax_output/SAMPLE-INV-2568-001-signed.xml \
    --tsa https://freetsa.org/tsr

  # ทดสอบด้วย Mock TSA:
  MODE=granted python tools/mock_tsa_server.py &
  python scripts/stamp_and_verify.py \
    --xml docs/etax_output/SAMPLE-INV-2568-001-signed.xml \
    --tsa http://127.0.0.1:18080/tsr

เสิร์ฟ: กลุ่ม 2 (คนกลาง/B2B), กลุ่ม 3 (Platform e-Tax)
"""

import argparse
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> None:
    print(f"[RUN] {' '.join(str(c) for c in cmd)}")
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.stdout:
        print(p.stdout)
    if p.returncode != 0:
        if p.stderr:
            print(p.stderr, file=sys.stderr)
        raise SystemExit(p.returncode)


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Stamp XAdES-T แล้วตรวจสอบอัตโนมัติ"
    )
    ap.add_argument("--xml",           required=True,
                    help="Signed XML (XAdES-BES) จาก xades_signer.py")
    ap.add_argument("--tsa",           required=True,
                    help="RFC 3161 TSA endpoint")
    ap.add_argument("--pytest-target", default="xades-engine/tests/test_xades_t.py",
                    help="pytest test file สำหรับ verify XAdES-T")
    args = ap.parse_args()

    xml_path = Path(args.xml)
    if not xml_path.exists():
        raise SystemExit(f"[ERROR] ไม่พบไฟล์: {xml_path}")

    # ── Step 1: Stamp XAdES-T ─────────────────────────────────────────────────
    run([
        sys.executable, "scripts/xades_tsa_stamp.py",
        "--xml", str(xml_path),
        "--tsa", args.tsa,
    ])

    # ── Step 2: ตรวจสอบด้วย pytest ───────────────────────────────────────────
    run([
        sys.executable, "-m", "pytest",
        args.pytest_target, "-v",
    ])

    print("[OK] XAdES-T stamping + verification เสร็จสมบูรณ์")


if __name__ == "__main__":
    main()
