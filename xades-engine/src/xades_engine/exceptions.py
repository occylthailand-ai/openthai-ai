class XAdESVerificationError(Exception):
    """Raised when cryptographic verification fails for an XAdES document."""
    pass


class XAdESMissingElementError(XAdESVerificationError):
    """Raised when a required XML element is absent."""
    pass


class XAdESPolicyError(XAdESVerificationError):
    """Raised when the signature policy does not match the expected ETDA policy."""
    pass
