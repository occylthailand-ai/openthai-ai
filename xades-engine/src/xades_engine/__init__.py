"""OpenThai eTax / XAdES Verification Engine."""

VERSION = "1.5.1-dev"  # Rust C14N v0.2.1 — 4 W3C spec fixes

from .xades_verifier import XAdESVerifier  # noqa: F401
from .exceptions import XAdESVerificationError, XAdESPolicyError  # noqa: F401
