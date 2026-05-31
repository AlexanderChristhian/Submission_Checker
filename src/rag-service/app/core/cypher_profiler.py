"""
Cypher Query Profiling Helper

Provides utilities to profile Neo4j queries:
- Execution time measurement
- Query plan analysis
- Parameter analysis
- Performance recommendations
"""

import time
from typing import Any
from app.core.neo4j_client import neo4j_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def profile_query(
    cypher: str,
    params: dict[str, Any] | None = None,
    explain: bool = False,
) -> dict[str, Any]:
    """
    Profile a Cypher query with timing and optional plan analysis.
    
    Args:
        cypher: The Cypher query string
        params: Query parameters
        explain: If True, also fetch EXPLAIN plan
        
    Returns:
        dict with timing, result count, and optional plan info
    """
    params = params or {}

    if explain:
        plan = await neo4j_client.run_query(f"EXPLAIN {cypher}", params)
    else:
        plan = None

    start = time.perf_counter()
    results = await neo4j_client.run_query(cypher, params)
    duration = time.perf_counter() - start

    profile_info = {
        "cypher": cypher[:200] + ("..." if len(cypher) > 200 else ""),
        "params": {k: v for k, v in params.items()},
        "execution_time_ms": round(duration * 1000, 2),
        "result_count": len(results),
        "explain_plan": plan,
    }

    threshold_warnings = _analyze_performance(cypher, duration, len(results))
    if threshold_warnings:
        profile_info["warnings"] = threshold_warnings
        for warning in threshold_warnings:
            logger.warning("Cypher query profile warning", extra={"warning": warning, "cypher": cypher[:100]})

    return profile_info


def _analyze_performance(
    cypher: str,
    duration: float,
    result_count: int,
) -> list[str]:
    warnings: list[str] = []

    if duration > 5.0:
        warnings.append(f"Query took {duration:.2f}s — consider adding indexes or rewriting")
    elif duration > 2.0:
        warnings.append(f"Query took {duration:.2f}s — should be optimized")

    if result_count > 10000:
        warnings.append(f"Query returned {result_count} results — consider adding LIMIT")

    cypher_upper = cypher.upper()
    if not cypher_upper.startswith("EXPLAIN") and not cypher_upper.startswith("PROFILE"):
        if "MATCH" in cypher_upper and "WHERE" not in cypher_upper:
            warnings.append("Unfiltered MATCH — add WHERE clause to limit search space")

    if "WHERE" in cypher_upper:
        has_indexed_property = any(
            label in cypher for label in ["Submission", "User", "Course", "Assignment"]
        )
        if not has_indexed_property:
            warnings.append("MATCH on node without label constraint — ensure indexes exist")

    return warnings


async def compare_query_variants(
    variants: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Compare multiple Cypher query variants for the same use case.
    
    Args:
        variants: List of dicts with 'name', 'cypher', 'params' keys
        
    Returns:
        List of profile results sorted by execution time
    """
    results = []
    for variant in variants:
        profile = await profile_query(
            cypher=variant["cypher"],
            params=variant.get("params"),
            explain=variant.get("explain", False),
        )
        profile["name"] = variant["name"]
        results.append(profile)

    results.sort(key=lambda r: r["execution_time_ms"])

    print("\n" + "=" * 60)
    print("CYPHER QUERY VARIANT COMPARISON")
    print("=" * 60)
    print(f"{'Variant':<25} {'Time (ms)':<12} {'Results':<10}")
    print("-" * 60)
    for r in results:
        print(f"{r['name']:<25} {r['execution_time_ms']:<12.2f} {r['result_count']:<10}")
    print("-" * 60)

    best = results[0]
    print(f"\nBest variant: {best['name']} ({best['execution_time_ms']}ms)")

    return results


async def get_index_recommendations() -> list[dict[str, str]]:
    """Query Neo4j for existing indexes and suggest missing ones."""
    try:
        indexes = await neo4j_client.run_query("SHOW INDEXES")
    except Exception:
        return []

    existing_labels = set()
    existing_properties: dict[str, set] = {}

    for idx in indexes:
        try:
            labels = idx.get("labelsOrTypes", [])
            properties = idx.get("properties", [])
            for label in labels:
                existing_labels.add(label)
                if label not in existing_properties:
                    existing_properties[label] = set()
                for prop in properties:
                    existing_properties[label].add(prop)
        except (KeyError, AttributeError):
            continue

    recommendations = []

    common_patterns = [
        ("Submission", ["submission_id", "status"]),
        ("User", ["user_id", "email", "role"]),
        ("Course", ["course_id", "code"]),
        ("Assignment", ["assignment_id", "course_id"]),
    ]

    for label, props in common_patterns:
        for prop in props:
            if label in existing_labels and prop not in existing_properties.get(label, set()):
                recommendations.append({
                    "label": label,
                    "property": prop,
                    "suggestion": f"CREATE INDEX FOR (n:{label}) ON (n.{prop})",
                })

    return recommendations
