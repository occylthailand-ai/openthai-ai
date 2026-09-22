"""Test fixture builder — generates signed XAdES-BES XML for unit tests."""
import base64
import datetime
import hashlib

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from lxml import etree

NS_DS = "http://www.w3.org/2000/09/xmldsig#"
NS_XADES = "http://uri.etsi.org/01903/v1.3.2#"
NS_INV = "urn:etda:etax:1.0"

_NSMAP = {"ds": NS_DS, "xades": NS_XADES, "r": NS_INV}


class XAdESMultiRefFixtureBuilder:
    """Build signed XAdES-BES XML for testing."""

    def __init__(self, private_key=None, cert_b64: str = "") -> None:
        if private_key is None:
            private_key = rsa.generate_private_key(65537, 2048)
        self.private_key = private_key
        self.cert_b64 = cert_b64
        if not cert_b64:
            self.cert_b64 = self._self_signed_cert_b64()

    def _self_signed_cert_b64(self) -> str:
        subject = issuer = x509.Name([
            x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, "OpenThai eTax Test CA"),
        ])
        now = datetime.datetime.now(datetime.timezone.utc)
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(self.private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=1))
            .sign(self.private_key, hashes.SHA256())
        )
        return base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode()

    def create_signed_xades_xml(self, doc_id: str = "INV-TEST-0001") -> bytes:
        root = etree.Element(f"{{{NS_INV}}}Invoice", nsmap=_NSMAP)
        header = etree.SubElement(root, f"{{{NS_INV}}}Header", Id=doc_id)
        etree.SubElement(header, f"{{{NS_INV}}}Seller").text = "Test Seller Co."
        etree.SubElement(header, f"{{{NS_INV}}}Buyer").text = "Test Buyer Co."
        etree.SubElement(header, f"{{{NS_INV}}}Amount").text = "1000.00"

        # Compute document digest
        header_bytes = etree.tostring(header, method="c14n", exclusive=True)
        doc_digest = base64.b64encode(hashlib.sha256(header_bytes).digest()).decode()

        # Build QualifyingProperties
        signing_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        qual_props_id = "QualifyingProperties-1"
        signed_props_id = "SignedProperties-1"

        qual_props = etree.SubElement(root, f"{{{NS_XADES}}}QualifyingProperties",
                                      Id=qual_props_id, Target="#Signature-1")
        signed_props = etree.SubElement(qual_props, f"{{{NS_XADES}}}SignedProperties",
                                        Id=signed_props_id)
        signed_sig_props = etree.SubElement(signed_props, f"{{{NS_XADES}}}SignedSignatureProperties")
        etree.SubElement(signed_sig_props, f"{{{NS_XADES}}}SigningTime").text = signing_time
        signing_cert = etree.SubElement(signed_sig_props, f"{{{NS_XADES}}}SigningCertificate")
        cert_elem = etree.SubElement(signing_cert, f"{{{NS_XADES}}}Cert")
        cert_digest = etree.SubElement(cert_elem, f"{{{NS_XADES}}}CertDigest")
        etree.SubElement(cert_digest, f"{{{NS_DS}}}DigestMethod",
                         Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
        cert_raw = base64.b64decode(self.cert_b64)
        cert_hash = base64.b64encode(hashlib.sha256(cert_raw).digest()).decode()
        etree.SubElement(cert_digest, f"{{{NS_DS}}}DigestValue").text = cert_hash

        # Compute SignedProperties digest
        sp_bytes = etree.tostring(signed_props, method="c14n", exclusive=True)
        sp_digest = base64.b64encode(hashlib.sha256(sp_bytes).digest()).decode()

        # Build ds:Signature
        sig = etree.SubElement(root, f"{{{NS_DS}}}Signature", Id="Signature-1", nsmap=_NSMAP)
        signed_info = etree.SubElement(sig, f"{{{NS_DS}}}SignedInfo")
        etree.SubElement(signed_info, f"{{{NS_DS}}}CanonicalizationMethod",
                         Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#")
        etree.SubElement(signed_info, f"{{{NS_DS}}}SignatureMethod",
                         Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256")

        ref1 = etree.SubElement(signed_info, f"{{{NS_DS}}}Reference", URI=f"#{doc_id}")
        transforms1 = etree.SubElement(ref1, f"{{{NS_DS}}}Transforms")
        etree.SubElement(transforms1, f"{{{NS_DS}}}Transform",
                         Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#")
        etree.SubElement(ref1, f"{{{NS_DS}}}DigestMethod",
                         Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
        etree.SubElement(ref1, f"{{{NS_DS}}}DigestValue").text = doc_digest

        ref2 = etree.SubElement(signed_info, f"{{{NS_DS}}}Reference",
                                 URI=f"#{signed_props_id}",
                                 Type="http://uri.etsi.org/01903#SignedProperties")
        etree.SubElement(ref2, f"{{{NS_DS}}}DigestMethod",
                         Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
        etree.SubElement(ref2, f"{{{NS_DS}}}DigestValue").text = sp_digest

        # Compute signature over ds:SignedInfo
        si_bytes = etree.tostring(signed_info, method="c14n", exclusive=True)
        sig_bytes = self.private_key.sign(si_bytes, padding.PKCS1v15(), hashes.SHA256())
        sig_b64 = base64.b64encode(sig_bytes).decode()

        sig_val = etree.SubElement(sig, f"{{{NS_DS}}}SignatureValue")
        sig_val.text = sig_b64

        key_info = etree.SubElement(sig, f"{{{NS_DS}}}KeyInfo")
        x509_data = etree.SubElement(key_info, f"{{{NS_DS}}}X509Data")
        etree.SubElement(x509_data, f"{{{NS_DS}}}X509Certificate").text = self.cert_b64

        return etree.tostring(root, xml_declaration=True, encoding="UTF-8")
