"""
หมวด 6 — Drivers/Adapters: กรมสรรพากร e-Tax Gateway Submitter
ส่งใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice) ไปยัง RD Gateway

⚠️  สำคัญมาก — สถาปัตยกรรมการเชื่อมต่อ RD:
    RD ไม่ได้เปิด public REST API สำหรับส่ง e-Tax Invoice
    การส่งข้อมูลจริงต้องผ่าน 3 ช่องทางเท่านั้น:

    1. MPLS Private Network (สำหรับ Service Provider ขนาดใหญ่):
       - Production : etaxservicempls.rd.go.th  (IP: 10.255.1.183 / backup 10.255.2.183)
       - UAT/Test   : etaxserviceuatmpls.rd.go.th
       - ต้องขอ MPLS circuit จาก RD โดยตรง (ไม่ใช่ public internet)
       - SSL: SHA-2 ขึ้นไป, CN ต้องระบุใน Subject หรือ DNS Name

    2. Web Upload (สำหรับ SME / ทดสอบ):
       - Production : https://etax.rd.go.th   → อัพโหลด XML/PDF ผ่านเว็บ
       - UAT        : https://etaxwsuat.rd.go.th (เข้าถึงได้จาก public internet)

    3. ผ่าน Service Provider ที่ได้รับอนุญาตจาก RD:
       - ตรวจสอบรายชื่อ SP ที่ https://etaxws.rd.go.th/etaxapi/services/checkRegstration
       - แต่ละ SP มี endpoint เป็นของตัวเอง

    API สาธารณะที่ใช้ได้:
       - ตรวจสอบสถานะ SP : https://etaxws.rd.go.th/etaxapi/services/checkRegstration (JSON)
       - ค้นหา e-Tax      : https://etax.rd.go.th/ETAXSEARCH/
       - RD e-Filing API  : https://efiling.rd.go.th/rd-cms/api (สำหรับ ภ.ง.ด./ภ.พ.)

    ก่อน Production: ต้องขอ MPLS circuit จาก RD → webservice@rd.go.th หรือ โทร 1161

Reference:
    - ประกาศกรมสรรพากร เรื่อง ใบกำกับภาษีอิเล็กทรอนิกส์
    - เอกสาร Service Provider PDF: etax.rd.go.th/.../09_Service-Provider.pdf
    - ตรวจสอบ API: rd.go.th/62829.html
"""

from __future__ import annotations
import hashlib
import hmac
import time
import json
from datetime import datetime, timezone
from typing import Optional
import httpx

# ===== RD Endpoints (ยืนยันจากเอกสาร RD จริง สิงหาคม 2569) =====

# MPLS Private Network (สำหรับ Service Provider — ต้องขอ circuit จาก RD)
RD_MPLS_PROD_HOST = "etaxservicempls.rd.go.th"
RD_MPLS_UAT_HOST  = "etaxserviceuatmpls.rd.go.th"
RD_MPLS_IP_PRIMARY = "10.255.1.183"
RD_MPLS_IP_BACKUP  = "10.255.2.183"

# Public API (ตรวจสอบสถานะ Service Provider — ใช้ได้ทันที)
RD_CHECK_REGISTRATION_URL = "https://etaxws.rd.go.th/etaxapi/services/checkRegstration"

# Web Upload Portal (สำหรับ SME / ทดสอบ)
RD_WEB_PROD_URL = "https://etax.rd.go.th"
RD_WEB_UAT_URL  = "https://etaxwsuat.rd.go.th"

# e-Filing Open API (ภ.ง.ด./ภ.พ. — ไม่ใช่สำหรับ e-Tax Invoice XML)
RD_EFILING_API_BASE = "https://efiling.rd.go.th/rd-cms"


class RDRegistrationChecker:
    """
    ตรวจสอบสถานะ Service Provider และเลขประจำตัวผู้เสียภาษี
    ใช้ Public API ที่เปิดให้ใช้งานได้ทันทีโดยไม่ต้องขอ MPLS
    """

    def check_registration(self, taxpayer_id: str) -> dict:
        """
        ตรวจสอบว่าผู้เสียภาษีได้รับอนุญาตให้ใช้ e-Tax Invoice หรือไม่
        Endpoint จริง: https://etaxws.rd.go.th/etaxapi/services/checkRegstration

        Response codes:
            T001 = Success (ได้รับอนุญาต)
            T002 = Tax Not Found (ไม่พบในระบบ)
            T003 = Invalid Parameter
            T999 = System Error
        """
        resp = httpx.post(
            RD_CHECK_REGISTRATION_URL,
            json={"taxId": taxpayer_id},
            headers={"Content-Type": "application/json"},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()


class RDMPLSSubmitter:
    """
    ส่ง e-Tax Invoice ผ่าน MPLS Private Network ของ RD
    ⚠️  ต้องขอ MPLS circuit จาก RD ก่อน → webservice@rd.go.th หรือ 1161

    ขั้นตอนการขอ:
    1. ลงทะเบียนเป็น Service Provider กับ RD
    2. ขอ MPLS connection (RD จัดสรร IP 10.255.x.x ให้)
    3. รับ client certificate (SHA-2, CN = ชื่อบริษัท)
    4. ทดสอบกับ etaxserviceuatmpls.rd.go.th ก่อน
    5. เปิดใช้งาน Production บน etaxservicempls.rd.go.th
    """

    def __init__(
        self,
        taxpayer_id: str,
        client_cert_path: str,   # path ไปยัง client cert (SHA-2) ที่ RD ออกให้
        client_key_path: str,
        environment: str = "uat",
    ):
        self.taxpayer_id = taxpayer_id
        host = RD_MPLS_UAT_HOST if environment == "uat" else RD_MPLS_PROD_HOST
        # Base URL — path จริงต้องยืนยันจาก RD spec document เมื่อได้รับ MPLS access
        self.base_url = f"https://{host}"
        self._client = httpx.Client(
            cert=(client_cert_path, client_key_path),
            timeout=30.0,
            headers={"Content-Type": "application/xml; charset=UTF-8"},
        )

    def submit_invoice(self, signed_xml: bytes, invoice_number: str) -> dict:
        """
        ส่ง XML ที่ลงนาม XAdES แล้วไปยัง RD MPLS endpoint
        ⚠️  Path (/submit หรืออื่น) ต้องยืนยันจาก RD spec เมื่อได้ MPLS access
        """
        resp = self._client.post(
            f"{self.base_url}/submit",
            content=signed_xml,
        )
        resp.raise_for_status()
        return {
            "status": "submitted_via_mpls",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "invoice_number": invoice_number,
            "http_status": resp.status_code,
            "environment": "uat" if "uat" in self.base_url else "production",
        }

    def close(self):
        self._client.close()


# ===== Backward-compat alias (ใช้ระหว่างรอ MPLS) =====
class RDGatewaySubmitter(RDMPLSSubmitter):
    """
    Alias — backward compatible กับ api_server.py
    ในระหว่างรอ MPLS ใช้ RDRegistrationChecker.check_registration() แทน
    """
    def __init__(self, taxpayer_id, api_key, api_secret, environment="uat"):
        self.taxpayer_id = taxpayer_id
        self._api_key = api_key
        self._api_secret = api_secret
        self._env = environment
        self._client = httpx.Client(timeout=30.0)
        host = RD_MPLS_UAT_HOST if environment in ("uat", "staging") else RD_MPLS_PROD_HOST
        self.base_url = f"https://{host}"

    def submit_invoice(self, signed_xml: bytes, invoice_number: str) -> dict:
        raise NotImplementedError(
            "ยังไม่สามารถส่งได้ — ต้องขอ MPLS circuit จาก RD ก่อน\n"
            "ติดต่อ: webservice@rd.go.th หรือ โทร 1161\n"
            f"UAT host: {RD_MPLS_UAT_HOST} | Prod host: {RD_MPLS_PROD_HOST}"
        )

    def check_status(self, taxpayer_id: str) -> dict:
        return RDRegistrationChecker().check_registration(taxpayer_id)

    def close(self):
        self._client.close()

    def close(self):
        self._client.close()
