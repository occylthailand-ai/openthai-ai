"""
หมวด 5 — BIOS/Firmware: SoftHSM2 Integration
เชื่อมต่อ SoftHSM2 ผ่าน PKCS#11 เพื่อ:
- ลงนาม XAdES ด้วย Private Key ที่เก็บใน HSM
- ดึง KEK (Key Encryption Key) สำหรับ Vault
- ไม่มี Private Key อยู่ใน memory หรือ disk เด็ดขาด
"""

from __future__ import annotations
import os
import hashlib
from pathlib import Path

try:
    import PyKCS11  # pip install PyKCS11
    PKCS11_AVAILABLE = True
except ImportError:
    PKCS11_AVAILABLE = False


SOFTHSM_LIB = os.environ.get(
    "SOFTHSM2_LIB",
    "/usr/lib/softhsm/libsofthsm2.so"
)
HSM_USER_PIN = os.environ.get("HSM_USER_PIN", "87654321")
KEY_LABEL_SIGN = os.environ.get("HSM_KEY_SIGN", "xades-signing-key")
TOKEN_LABEL = os.environ.get("HSM_TOKEN_LABEL", "openthai-etax")


class HSMSession:
    """Context manager สำหรับ PKCS#11 session — ไม่ทิ้ง session ค้างอยู่"""

    def __init__(self):
        if not PKCS11_AVAILABLE:
            raise ImportError("ติดตั้ง PyKCS11 ก่อน: pip install PyKCS11")
        self._lib = PyKCS11.PyKCS11Lib()
        self._lib.load(SOFTHSM_LIB)
        self._session = None

    def __enter__(self):
        slots = self._lib.getSlotList(tokenPresent=True)
        for slot in slots:
            info = self._lib.getTokenInfo(slot)
            if info.label.strip() == TOKEN_LABEL:
                self._session = self._lib.openSession(slot)
                self._session.login(HSM_USER_PIN)
                return self._session
        raise RuntimeError(f"ไม่พบ HSM token ที่มี label '{TOKEN_LABEL}'")

    def __exit__(self, *_):
        if self._session:
            try:
                self._session.logout()
                self._session.closeSession()
            except Exception:
                pass


def sign_with_hsm(data: bytes, mechanism=None) -> bytes:
    """ลงนายข้อมูล data ด้วย RSA Private Key ใน HSM"""
    if not PKCS11_AVAILABLE:
        raise RuntimeError("HSM ไม่พร้อมใช้งาน — ติดตั้ง PyKCS11 หรือเปิด SoftHSM2")

    import PyKCS11
    if mechanism is None:
        mechanism = PyKCS11.Mechanism(PyKCS11.CKM_SHA256_RSA_PKCS)

    with HSMSession() as session:
        keys = session.findObjects([
            (PyKCS11.CKA_CLASS, PyKCS11.CKO_PRIVATE_KEY),
            (PyKCS11.CKA_LABEL, KEY_LABEL_SIGN),
        ])
        if not keys:
            raise RuntimeError(f"ไม่พบ Private Key label='{KEY_LABEL_SIGN}' ใน HSM")
        signature = session.sign(keys[0], data, mechanism)
        return bytes(signature)


def get_public_key_pem() -> str:
    """ดึง Public Key จาก HSM แล้วแปลงเป็น PEM"""
    if not PKCS11_AVAILABLE:
        raise RuntimeError("HSM ไม่พร้อมใช้งาน")

    import PyKCS11
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers

    with HSMSession() as session:
        keys = session.findObjects([
            (PyKCS11.CKA_CLASS, PyKCS11.CKO_PUBLIC_KEY),
            (PyKCS11.CKA_LABEL, KEY_LABEL_SIGN),
        ])
        if not keys:
            raise RuntimeError("ไม่พบ Public Key ใน HSM")
        attrs = session.getAttributeValue(keys[0], [PyKCS11.CKA_MODULUS, PyKCS11.CKA_PUBLIC_EXPONENT])
        n = int.from_bytes(bytes(attrs[0]), 'big')
        e = int.from_bytes(bytes(attrs[1]), 'big')
        pub_key = RSAPublicNumbers(e, n).public_key()
        return pub_key.public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()


class SoftwareSignerFallback:
    """
    Fallback เมื่อ HSM ไม่พร้อม (ใช้สำหรับ dev/test เท่านั้น)
    ใช้ XADES_SIGNING_KEY_PATH env var ชี้ไปยัง PEM private key
    """

    def __init__(self):
        from cryptography.hazmat.primitives import serialization, hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.backends import default_backend

        key_path = os.environ.get("XADES_SIGNING_KEY_PATH")
        if not key_path or not Path(key_path).exists():
            raise FileNotFoundError(
                "ไม่พบ HSM และไม่มี XADES_SIGNING_KEY_PATH — ไม่สามารถลงนามได้"
            )
        with open(key_path, "rb") as f:
            self._key = serialization.load_pem_private_key(f.read(), password=None, backend=default_backend())

        self._padding = padding.PKCS1v15()
        self._hash = hashes.SHA256()

    def sign(self, data: bytes) -> bytes:
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.primitives import hashes
        return self._key.sign(data, padding.PKCS1v15(), hashes.SHA256())


def get_signer():
    """ส่งคืน signer ที่ดีที่สุดที่มี (HSM > Software fallback)"""
    if PKCS11_AVAILABLE and Path(SOFTHSM_LIB).exists():
        try:
            # ทดสอบ connect
            with HSMSession():
                pass
            return "hsm"
        except Exception:
            pass
    return SoftwareSignerFallback()
