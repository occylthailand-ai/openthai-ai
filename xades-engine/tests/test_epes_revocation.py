"""XAdES-EPES and LiveRevocationChecker tests (Phase 3 edition)."""
import datetime
import pytest
from unittest.mock import MagicMock, patch
from lxml import etree
from xades_engine.xades_epes import XAdESEPESVerifier, ETDA_POLICY_URI
from xades_engine.revocation import LiveRevocationChecker, _utcnow
from xades_engine.exceptions import XAdESPolicyError, XAdESVerificationError

NS_DS = "http://www.w3.org/2000/09/xmldsig#"
NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"


def _epes_xml(policy_id: str | None = None, implied: bool = False) -> etree._Element:
    if implied:
        inner = "<xades:SignaturePolicyImplied/>"
    elif policy_id:
        inner = f"""
        <xades:SignaturePolicyId>
            <xades:SigPolicyId><xades:Identifier>{policy_id}</xades:Identifier></xades:SigPolicyId>
            <xades:SigPolicyHash>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>abc123==</ds:DigestValue>
            </xades:SigPolicyHash>
        </xades:SignaturePolicyId>"""
    else:
        inner = ""

    xml = f"""
    <r:Invoice xmlns:r="urn:etda:etax:1.0" xmlns:ds="{NS_DS}" xmlns:xades="{NS_XADES}">
        <xades:QualifyingProperties>
            <xades:SignedProperties>
                <xades:SignedSignatureProperties>
                    {"<xades:SignaturePolicyIdentifier>" + inner + "</xades:SignaturePolicyIdentifier>" if inner or implied else ""}
                </xades:SignedSignatureProperties>
            </xades:SignedProperties>
        </xades:QualifyingProperties>
    </r:Invoice>
    """
    return etree.fromstring(xml)


# ──── EPES tests ──────────────────────────────────────────────────────────

def test_bes_mode_no_policy():
    root = etree.fromstring(b"<Invoice/>")
    result = XAdESEPESVerifier().verify_policy_identifier(root)
    assert result["profile"] == "XAdES-BES"
    assert result["is_valid"] is True


def test_epes_explicit_valid():
    root = _epes_xml(policy_id=ETDA_POLICY_URI)
    result = XAdESEPESVerifier().verify_policy_identifier(root)
    assert result["profile"] == "XAdES-EPES"
    assert result["policy_type"] == "explicit"
    assert result["is_valid"] is True


def test_epes_implied():
    root = _epes_xml(implied=True)
    result = XAdESEPESVerifier().verify_policy_identifier(root)
    assert result["policy_type"] == "implied"
    assert result["is_valid"] is True


def test_epes_wrong_policy_raises():
    root = _epes_xml(policy_id="http://wrong.policy.example.com/v1")
    with pytest.raises(XAdESPolicyError, match="mismatch"):
        XAdESEPESVerifier().verify_policy_identifier(root)


def test_epes_missing_identifier_raises():
    xml = f"""
    <Invoice xmlns:xades="{NS_XADES}">
        <xades:QualifyingProperties>
            <xades:SignedProperties>
                <xades:SignedSignatureProperties>
                    <xades:SignaturePolicyIdentifier>
                        <xades:SignaturePolicyId>
                        </xades:SignaturePolicyId>
                    </xades:SignaturePolicyIdentifier>
                </xades:SignedSignatureProperties>
            </xades:SignedProperties>
        </xades:QualifyingProperties>
    </Invoice>"""
    root = etree.fromstring(xml)
    with pytest.raises(XAdESVerificationError, match="missing or empty"):
        XAdESEPESVerifier().verify_policy_identifier(root)


# ──── Revocation tests ────────────────────────────────────────────────────

def test_revocation_checker_instantiation():
    checker = LiveRevocationChecker(cache_ttl_seconds=1800, timeout_seconds=3)
    assert checker.ocsp_ttl == 1800
    assert checker.timeout == 3
    assert checker.crl_ttl == 86400  # default 24 h


def test_revocation_checker_no_library(monkeypatch):
    import xades_engine.revocation as rev_mod
    monkeypatch.setattr(rev_mod, "HAS_REVOCATION", False)
    checker = rev_mod.LiveRevocationChecker()

    class FakeCert:
        serial_number = 12345

    result = checker.validate(FakeCert())
    assert result["status"] == "SKIPPED"


def _make_fake_cert(serial: int, ocsp_url: str | None = None, crl_url: str | None = None):
    """Minimal certificate mock with AIA/CDP extensions."""
    cert = MagicMock()
    cert.serial_number = serial

    # AIA OCSP
    if ocsp_url:
        access_desc = MagicMock()
        access_desc.access_method = MagicMock()
        from cryptography.x509 import AuthorityInformationAccessOID
        access_desc.access_method = AuthorityInformationAccessOID.OCSP
        access_desc.full_name = [MagicMock(value=ocsp_url)]
        aia_ext = MagicMock()
        aia_ext.value = [access_desc]

        def _aia_getter(oid):
            from cryptography.x509 import ExtensionOID
            if oid == ExtensionOID.AUTHORITY_INFORMATION_ACCESS:
                return aia_ext
            raise Exception("No extension")

        cert.extensions.get_extension_for_oid.side_effect = _aia_getter
    else:
        cert.extensions.get_extension_for_oid.side_effect = Exception("No AIA")

    return cert


def test_revocation_ocsp_good(monkeypatch):
    """OCSP POST succeeds → status GOOD."""
    import xades_engine.revocation as rev_mod

    fake_resp = MagicMock()
    fake_resp.status_code = 200
    fake_resp.content = b"dummy-ocsp"

    monkeypatch.setattr(rev_mod, "_retry_post", lambda *a, **kw: fake_resp)
    monkeypatch.setattr(rev_mod, "HAS_REVOCATION", True)

    # Mock parse_ocsp_response to return GOOD
    checker = rev_mod.LiveRevocationChecker()
    checker._parse_ocsp_response = lambda content, server, now: {
        "method": "OCSP",
        "server": server,
        "status": "GOOD",
        "this_update": now.isoformat(),
        "next_update": None,
        "checked_at": now.isoformat(),
        "cached": False,
    }

    cert = _make_fake_cert(serial=9999, ocsp_url="http://ocsp.example.com/")
    issuer = MagicMock()

    result = checker.validate(cert, issuer_cert=issuer)
    assert result["status"] == "GOOD"
    assert result["method"] == "OCSP"


def test_revocation_cache_hit():
    """Second call for same serial returns cached result without network."""
    checker = LiveRevocationChecker(cache_ttl_seconds=3600)
    sn = hex(555)
    now = _utcnow()
    checker._cache[sn] = (now, {
        "method": "OCSP",
        "status": "GOOD",
        "checked_at": now.isoformat(),
        "cached": False,
    })

    class FakeCert:
        serial_number = 555

    result = checker.validate(FakeCert())
    assert result["status"] == "GOOD"
    assert result.get("cached") is True


def test_revocation_cache_expired():
    """Expired cache entry triggers a re-check."""
    checker = LiveRevocationChecker(cache_ttl_seconds=1)
    sn = hex(777)
    old = _utcnow() - datetime.timedelta(seconds=60)
    checker._cache[sn] = (old, {"method": "OCSP", "status": "GOOD", "checked_at": old.isoformat(), "cached": False})

    class FakeCert:
        serial_number = 777
        extensions = MagicMock()

    # No libraries installed → falls through to SKIPPED (or UNDETERMINED if HAS_REVOCATION)
    import xades_engine.revocation as rev_mod
    orig = rev_mod.HAS_REVOCATION
    rev_mod.HAS_REVOCATION = False
    try:
        result = checker.validate(FakeCert())
        assert result["status"] == "SKIPPED"  # re-checked, not served from stale cache
    finally:
        rev_mod.HAS_REVOCATION = orig


def test_revocation_undetermined_when_no_endpoints():
    """No AIA + no fallback endpoints → UNDETERMINED."""
    import xades_engine.revocation as rev_mod
    if not rev_mod.HAS_REVOCATION:
        pytest.skip("revocation libraries not installed")

    checker = rev_mod.LiveRevocationChecker()

    class FakeCert:
        serial_number = 888
        extensions = MagicMock()
        extensions.get_extension_for_oid = MagicMock(side_effect=Exception("no ext"))

    result = checker.validate(FakeCert())
    assert result["status"] == "UNDETERMINED"
