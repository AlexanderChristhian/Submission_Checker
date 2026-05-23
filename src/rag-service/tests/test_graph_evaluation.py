"""
Graph Retrieval Evaluation Pipeline

Compares three retrieval methods:
  1. Vector-only (ChromaDB)
  2. Hybrid Graph (ChromaDB + Neo4j fused via RRF/weighted)
  3. GraphRAG (hybrid search + graph enrichment + LLM synthesis)

Metrics: Hit Rate, MRR, Precision@k, Recall@k, Graph Contribution
"""

import asyncio
import json
import time
import numpy as np
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.querying import retrieve_chunks
from app.services.hybrid_graph_search import hybrid_search
from app.services.graphrag_service import graphrag_query

client = TestClient(app)

# ── Evaluation Dataset ───────────────────────────────────
EVAL_QUERIES = [
    "sorting algorithms comparison",
    "graph traversal techniques",
    "binary search tree implementation",
    "neural network architecture",
    "machine learning classification",
    "data structure analysis",
    "algorithm complexity",
    "database design patterns",
    "quick sort vs merge sort",
    "recursive algorithms",
]

GROUND_TRUTH_KEYWORDS: list[list[str]] = [
    ["quick sort", "merge sort", "sorting", "comparison"],
    ["DFS", "BFS", "graph traversal", "depth first"],
    ["binary search", "BST", "tree", "node insertion"],
    ["neural network", "CNN", "perceptron", "layer"],
    ["machine learning", "classification", "model"],
    ["data structure", "array", "linked list"],
    ["complexity", "big O", "analysis", "performance"],
    ["database", "schema", "design", "normalization"],
    ["quick sort", "merge sort", "comparison", "performance"],
    ["recursive", "recursion", "stack", "divide"],
]


# ── Metrics Calculator ───────────────────────────────────
def hit_rate(results: list[set[Any]]) -> float:
    if not results:
        return 0.0
    hits = sum(1 for r in results if r)
    return hits / len(results)


def mrr(results: list[list[Any]], ground_truth_sets: list[set[Any]]) -> float:
    if not results or not ground_truth_sets:
        return 0.0
    total = 0.0
    for retrieved, relevant in zip(results, ground_truth_sets):
        if not relevant:
            continue
        for rank, item in enumerate(retrieved):
            if item in relevant:
                total += 1.0 / (rank + 1)
                break
    return total / len(results)


def precision_at_k(retrieved_sets: list[set[Any]], ground_truth_sets: list[set[Any]], k: int = 5) -> float:
    if not retrieved_sets or not ground_truth_sets:
        return 0.0
    total = 0.0
    for retrieved, relevant in zip(retrieved_sets, ground_truth_sets):
        if not retrieved:
            continue
        relevant_in_top = len(retrieved & relevant)
        total += relevant_in_top / min(k, len(retrieved))
    return total / len(retrieved_sets)


def recall_at_k(retrieved_sets: list[set[Any]], ground_truth_sets: list[set[Any]]) -> float:
    if not retrieved_sets or not ground_truth_sets:
        return 0.0
    total_recall = 0.0
    for retrieved, relevant in zip(retrieved_sets, ground_truth_sets):
        if not relevant:
            continue
        found = len(retrieved & relevant)
        total_recall += found / len(relevant)
    return total_recall / len(retrieved_sets)


def percent_new_results(
    hybrid_sets: list[set[Any]],
    vector_sets: list[set[Any]],
) -> float:
    """% of hybrid results that vector-only missed."""
    total_new = 0
    total_hybrid = 0
    for h, v in zip(hybrid_sets, vector_sets):
        new = h - v
        total_new += len(new)
        total_hybrid += len(h)
    return total_new / total_hybrid if total_hybrid > 0 else 0.0


def calculate_method_metrics(
    id_sets: list[set[Any]],
    id_lists: list[list[Any]],
    ground_truth: list[set[Any]],
    label: str,
) -> dict[str, float]:
    return {
        f"{label}_hit_rate": hit_rate(id_sets),
        f"{label}_mrr": mrr(id_lists, ground_truth),
        f"{label}_precision_at_5": precision_at_k(id_sets, ground_truth, k=5),
        f"{label}_recall": recall_at_k(id_sets, ground_truth),
    }


def print_comparison_report(metrics: dict[str, Any]) -> None:
    print("\n" + "=" * 65)
    print("GRAPH RETRIEVAL EVALUATION REPORT")
    print("=" * 65)

    methods = ["vector", "hybrid", "graphrag"]
    labels = {"vector": "Vector-only", "hybrid": "Hybrid Graph", "graphrag": "GraphRAG"}
    metric_labels = {
        "hit_rate": "Hit Rate",
        "mrr": "MRR",
        "precision_at_5": "Precision@5",
        "recall": "Recall",
    }

    print(f"\n{'Metric':<20} {'Vector-only':<15} {'Hybrid Graph':<15} {'GraphRAG':<15}")
    print("-" * 65)
    for metric_key, metric_label in metric_labels.items():
        row = [metric_label]
        for method in methods:
            key = f"{method}_{metric_key}"
            val = metrics.get(key, "N/A")
            if isinstance(val, float):
                row.append(f"{val:.3f}")
            else:
                row.append(str(val))
        print(f"{row[0]:<20} {row[1]:<15} {row[2]:<15} {row[3]:<15}")

    print(f"\n{'Graph New Results':<20} {'':<15} {'':<15} {metrics.get('percent_new_hybrid', 0):.1%}")
    print(f"{'Latency (avg)':<20} {metrics.get('vector_latency_ms', 0):<15.0f} {metrics.get('hybrid_latency_ms', 0):<15.0f} {metrics.get('graphrag_latency_ms', 0):<15.0f}")
    print(f"\n{'Unit':<20} {'':<15} {'':<15} {'ms':<15}")

    # Improvement summary
    print("\n" + "-" * 65)
    print("IMPROVEMENT OVER VECTOR BASELINE")
    print("-" * 65)
    for metric_key, metric_label in metric_labels.items():
        v = metrics.get(f"vector_{metric_key}", 0) or 0.001
        h = metrics.get(f"hybrid_{metric_key}", 0)
        g = metrics.get(f"graphrag_{metric_key}", 0)
        h_imp = ((h - v) / v) * 100
        g_imp = ((g - v) / v) * 100
        print(f"{metric_label:<20} Hybrid: {h_imp:+.1f}%   GraphRAG: {g_imp:+.1f}%")

    print("\n" + "=" * 65)


# ── Main Evaluation ──────────────────────────────────────
async def run_graph_evaluation(top_k: int = 10) -> dict[str, Any]:
    print("🚀 Starting Graph Retrieval Evaluation...")
    print(f"   Queries: {len(EVAL_QUERIES)}, top_k: {top_k}")

    vector_id_sets: list[set[int]] = []
    hybrid_id_sets: list[set[int]] = []
    graphrag_id_sets: list[set[int]] = []

    vector_id_lists: list[list[int]] = []
    hybrid_id_lists: list[list[int]] = []
    graphrag_id_lists: list[list[int]] = []

    vector_latencies: list[float] = []
    hybrid_latencies: list[float] = []
    graphrag_latencies: list[float] = []

    ground_truth: list[set[int]] = []

    for i, query in enumerate(EVAL_QUERIES):
        print(f"\n  [{i + 1}/{len(EVAL_QUERIES)}] \"{query}\"")

        # 1. Vector-only (ChromaDB)
        t0 = time.time()
        chunks = retrieve_chunks(query, top_k=top_k)
        vector_latencies.append((time.time() - t0) * 1000)
        v_ids = {
            int(c["metadata"]["submission_id"])
            for c in chunks
            if c["metadata"].get("submission_id") is not None
        }
        vector_id_sets.append(v_ids)
        vector_id_lists.append(list(v_ids))
        print(f"     Vector: {len(v_ids)} results")

        # 2. Hybrid Graph (ChromaDB + Neo4j)
        t0 = time.time()
        try:
            hybrid_result = await hybrid_search(query, top_k=top_k, fusion="rrf")
            hybrid_lat = (time.time() - t0) * 1000
            hybrid_latencies.append(hybrid_lat)
            h_ids = {int(r["id"]) for r in hybrid_result["results"] if r.get("id") is not None}
        except Exception as e:
            print(f"     Hybrid FAILED: {e}")
            h_ids = set()
            hybrid_latencies.append(0)
        hybrid_id_sets.append(h_ids)
        hybrid_id_lists.append(list(h_ids))
        new_count = len(h_ids - v_ids)
        print(f"     Hybrid: {len(h_ids)} results ({new_count} new from graph)")

        # 3. GraphRAG (hybrid + enrichment + LLM)
        t0 = time.time()
        try:
            graphrag_result = await graphrag_query(query, top_k=top_k)
            graphrag_lat = (time.time() - t0) * 1000
            graphrag_latencies.append(graphrag_lat)
            g_ids = {
                int(c["metadata"].get("submission_id"))
                for c in graphrag_result["chunks"]
                if c.get("metadata") and c["metadata"].get("submission_id") is not None
            }
        except Exception as e:
            print(f"     GraphRAG FAILED: {e}")
            g_ids = set()
            graphrag_latencies.append(0)
        graphrag_id_sets.append(g_ids)
        graphrag_id_lists.append(list(g_ids))
        print(f"     GraphRAG: {len(g_ids)} results")

        # Ground truth: union of all methods
        all_ids = v_ids | h_ids | g_ids
        ground_truth.append(all_ids)
        print(f"     Ground truth: {len(all_ids)} unique items")

    # ── Calculate metrics ─────────────────────────────────
    metrics: dict[str, Any] = {}

    metrics.update(calculate_method_metrics(vector_id_sets, vector_id_lists, ground_truth, "vector"))
    metrics.update(calculate_method_metrics(hybrid_id_sets, hybrid_id_lists, ground_truth, "hybrid"))
    metrics.update(calculate_method_metrics(graphrag_id_sets, graphrag_id_lists, ground_truth, "graphrag"))

    # Graph contribution
    metrics["percent_new_hybrid"] = percent_new_results(hybrid_id_sets, vector_id_sets)

    # Latency
    metrics["vector_latency_ms"] = np.mean(vector_latencies) if vector_latencies else 0
    metrics["hybrid_latency_ms"] = np.mean(hybrid_latencies) if hybrid_latencies else 0
    metrics["graphrag_latency_ms"] = np.mean(graphrag_latencies) if graphrag_latencies else 0

    # Report
    print_comparison_report(metrics)

    return metrics


# ── Pytest Tests ─────────────────────────────────────────
@pytest.mark.asyncio
async def test_vector_retrieval():
    """Test that vector-only retrieval returns results."""
    chunks = retrieve_chunks("sorting algorithms", top_k=5)
    assert len(chunks) > 0
    assert all("text" in c and "score" in c and "metadata" in c for c in chunks)


@pytest.mark.asyncio
async def test_graph_metrics_calculation():
    """Test metric calculation functions."""
    mock_sets = [{1, 2, 3}, {4, 5}, set()]
    mock_lists = [[1, 2, 3], [4, 5], []]
    mock_truth = [{1, 2, 3, 6}, {4, 5, 7}, {8, 9}]

    hr = hit_rate(mock_sets)
    assert hr == 2 / 3

    m = mrr(mock_lists, mock_truth)
    assert m > 0

    new_pct = percent_new_results(mock_sets, [{3}, {5}, set()])
    assert new_pct == 0.5  # 2 new out of 5 total hybrid results


# ── CLI Entry Point ──────────────────────────────────────
if __name__ == "__main__":
    try:
        response = client.get("/health")
        if response.status_code not in (200, 200):
            print("❌ RAG service is not running.")
            print("   Run: uvicorn app.main:app --reload")
            import sys
            sys.exit(1)
    except Exception:
        print("❌ Cannot connect to RAG service.")
        print("   Run: uvicorn app.main:app --reload")
        import sys
        sys.exit(1)

    asyncio.run(run_graph_evaluation(top_k=10))
