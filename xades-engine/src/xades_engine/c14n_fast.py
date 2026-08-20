"""Hybrid C14N execution router.

Preference order:
1. Rust native core (xades_rust_core) — sub-8 ms, full W3C compliance
2. lxml C-bindings — production fallback
"""
import logging

from lxml import etree

logger = logging.getLogger("xades_engine.c14n")

HAS_RUST_C14N = False
try:
    import xades_rust_core  # noqa: F401 (built via maturin)
    HAS_RUST_C14N = True
    logger.info("Rust native C14N core active")
except ImportError:
    logger.debug("Rust C14N unavailable — using lxml fallback")


def canonicalize_node_fast(
    node: etree._Element,
    exclusive: bool = True,
    with_comments: bool = False,
    inclusive_prefix_list: str | None = None,
) -> bytes:
    """Return the canonical serialisation of *node*.

    Uses the Rust engine when compiled; otherwise falls back to lxml.
    """
    if HAS_RUST_C14N and exclusive and not with_comments:
        try:
            raw = etree.tostring(node, encoding="utf-8")
            return xades_rust_core.c14n_exclusive(raw, inclusive_prefix_list)
        except Exception as exc:
            logger.warning("Rust C14N error (%s) — falling back to lxml", exc)

    return etree.tostring(
        node,
        method="c14n",
        exclusive=exclusive,
        with_comments=with_comments,
        inclusive_ns_prefixes=inclusive_prefix_list.split() if inclusive_prefix_list else None,
    )


def is_rust_active() -> bool:
    return HAS_RUST_C14N


def engine_version() -> str:
    if HAS_RUST_C14N:
        return getattr(xades_rust_core, "VERSION", "rust/unknown")
    return "lxml/" + etree.LXML_VERSION.__str__()
