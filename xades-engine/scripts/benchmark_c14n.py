"""C14N Performance Benchmark — lxml vs Rust native (when compiled).

Usage:
    python scripts/benchmark_c14n.py [--iterations 500]
"""
import sys
import time
import argparse

sys.path.insert(0, "src")

from lxml import etree
from xades_engine.c14n_fast import canonicalize_node_fast, is_rust_active, engine_version

_SAMPLE_XML = (
    '<r:Invoice xmlns:r="urn:etda:etax:1.0" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
    "<r:Header><r:Seller>Co A</r:Seller><r:Buyer>Co B</r:Buyer></r:Header>"
    "<r:LineItems>"
    + "".join(
        f'<r:Item id="{i}"><r:Name>Product {i}</r:Name><r:Price>100.00</r:Price></r:Item>'
        for i in range(1, 500)
    )
    + "</r:LineItems></r:Invoice>"
)


def run(iterations: int = 500) -> None:
    root = etree.fromstring(_SAMPLE_XML.encode())
    print("=" * 60)
    print("  OpenThai eTax C14N Engine — Performance Benchmark")
    print("=" * 60)
    print(f"  Backend   : {engine_version()}")
    print(f"  Rust core : {is_rust_active()}")
    print(f"  Iterations: {iterations}")
    print()

    t0 = time.perf_counter()
    for _ in range(iterations):
        canonicalize_node_fast(root, exclusive=True)
    elapsed = time.perf_counter() - t0

    avg_ms = (elapsed / iterations) * 1000
    throughput = iterations / elapsed

    print(f"  Average latency  : {avg_ms:.3f} ms/document")
    print(f"  Throughput       : {throughput:,.0f} docs/sec")
    print(f"  Target < 8 ms    : {'✅ ACHIEVED' if avg_ms < 8 else '❌ NOT MET'}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=500)
    args = parser.parse_args()
    run(args.iterations)
