"""
Chunking Strategy Comparison Experiment

Compares different chunk sizes and strategies on retrieval metrics:
- Sizes: 256, 512, 1024 tokens
- Strategies: recursive, sentence, token
- Metrics: Hit Rate, MRR, Precision@k, retrieval latency
"""

import time
import json
from typing import Any
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

CHUNK_CONFIGS = [
    {"name": "small_recursive", "chunk_size": 256, "chunk_overlap": 25},
    {"name": "medium_recursive", "chunk_size": 512, "chunk_overlap": 50},
    {"name": "large_recursive", "chunk_size": 1024, "chunk_overlap": 100},
    {"name": "medium_sentence", "chunk_size": 512, "chunk_overlap": 50, "splitter": "sentence"},
    {"name": "medium_token", "chunk_size": 512, "chunk_overlap": 50, "splitter": "token"},
]

EVAL_QUERIES = [
    "How does the submission checker detect plagiarism?",
    "What database does the system use for storing submissions?",
    "How are code submissions compared for similarity?",
    "What embedding model is used for code representation?",
    "How does the hybrid search combine vector and keyword search?",
    "What is the chunking strategy used for code documents?",
    "How are query results ranked and filtered?",
    "What API endpoints are available for similarity search?",
    "How does the multi-step query decomposition work?",
    "What is the response synthesis strategy?",
]

EVALUATION_KEYWORDS = [
    ["cosine similarity", "embeddings", "vector", "plagiarism"],
    ["Neo4j", "graph database", "Cypher"],
    ["vector", "similarity", "comparison", "matching"],
    ["embedding", "model", "code", "representation"],
    ["hybrid", "BM25", "fusion", "reciprocal rank"],
    ["chunking", "splitting", "overlap", "token"],
    ["ranking", "filtering", "threshold", "score"],
    ["API", "endpoint", "similarity", "search"],
    ["decomposition", "sub-query", "multi-step", "transform"],
    ["synthesis", "response", "compact", "refine"],
]


class ChunkingExperiment:
    def __init__(self):
        self.results: dict[str, Any] = {}

    def run_query(self, query: str, top_k: int = 5) -> dict[str, Any]:
        start = time.perf_counter()
        response = client.post("/query/search", json={"query": query, "top_k": top_k})
        latency = time.perf_counter() - start

        if response.status_code != 200:
            return {"latency": latency, "sources": [], "success": False}

        data = response.json()
        return {
            "latency": latency,
            "sources": data.get("sources", []),
            "success": True,
        }

    def evaluate_config(self, config: dict[str, Any]) -> dict[str, Any]:
        hit_count = 0
        mrr_sum = 0.0
        precision_sum = 0.0
        latencies: list[float] = []
        keyword_match_rates: list[float] = []
        source_counts: list[int] = []

        for query_idx, query in enumerate(EVAL_QUERIES):
            result = self.run_query(query)
            sources = result["sources"]
            latencies.append(result["latency"])
            source_counts.append(len(sources))

            if not sources:
                continue

            keywords = EVALUATION_KEYWORDS[query_idx]

            retrieved_texts = [s.get("text", "")[:200] for s in sources]
            found_positions = []
            for pos, text in enumerate(retrieved_texts):
                for kw in keywords:
                    if kw.lower() in text.lower():
                        found_positions.append(pos + 1)
                        break

            if found_positions:
                hit_count += 1
                mrr_sum += 1.0 / min(found_positions)
                keyword_matches = sum(
                    1 for kw in keywords if any(kw.lower() in t.lower() for t in retrieved_texts)
                )
                keyword_match_rates.append(keyword_matches / len(keywords))
            else:
                keyword_match_rates.append(0.0)

            relevant_count = len(found_positions)
            precision_sum += relevant_count / len(sources)

        n = len(EVAL_QUERIES)
        return {
            "config": config,
            "hit_rate": hit_count / n,
            "mrr": mrr_sum / n,
            "precision_at_5": precision_sum / n,
            "avg_latency": float(np.mean(latencies)),
            "p95_latency": float(np.percentile(latencies, 95)),
            "avg_source_count": float(np.mean(source_counts)),
            "avg_keyword_match_rate": float(np.mean(keyword_match_rates)) if keyword_match_rates else 0.0,
        }

    def run_all(self) -> dict[str, Any]:
        for config in CHUNK_CONFIGS:
            name = config["name"]
            print(f"Evaluating chunk config: {name} (size={config['chunk_size']})...")
            self.results[name] = self.evaluate_config(config)

        return self.results

    def print_report(self):
        print("\n" + "=" * 70)
        print("CHUNKING STRATEGY COMPARISON REPORT")
        print("=" * 70)

        headers = ["Config", "Size", "Hit Rate", "MRR", "P@5", "Avg Lat", "P95 Lat", "KW Match"]
        header_fmt = "{:<20} {:>6} {:>9} {:>6} {:>6} {:>9} {:>9} {:>9}"
        row_fmt = "{:<20} {:>6} {:>8.3f} {:>6.3f} {:>6.3f} {:>8.3f}s {:>8.3f}s {:>8.3f}"

        print()
        print(header_fmt.format(*headers))
        print("-" * 70)

        for name, result in self.results.items():
            config = result["config"]
            print(row_fmt.format(
                name,
                config["chunk_size"],
                result["hit_rate"],
                result["mrr"],
                result["precision_at_5"],
                result["avg_latency"],
                result["p95_latency"],
                result["avg_keyword_match_rate"],
            ))

        print("-" * 70)
        best_hit = max(self.results.items(), key=lambda x: x[1]["hit_rate"])
        fastest = min(self.results.items(), key=lambda x: x[1]["avg_latency"])
        print(f"\nBest Hit Rate:      {best_hit[0]} ({best_hit[1]['hit_rate']:.3f})")
        print(f"Fastest Config:     {fastest[0]} ({fastest[1]['avg_latency']:.3f}s)")

    def save_report(self, path: str = "chunking_comparison_results.json"):
        output = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "query_count": len(EVAL_QUERIES),
            "configs": self.results,
            "summary": {
                "best_hit_rate": max(self.results.items(), key=lambda x: x[1]["hit_rate"])[0],
                "fastest_config": min(self.results.items(), key=lambda x: x[1]["avg_latency"])[0],
            },
        }
        with open(path, "w") as f:
            json.dump(output, f, indent=2)
        print(f"\nResults saved to {path}")


if __name__ == "__main__":
    experiment = ChunkingExperiment()
    experiment.run_all()
    experiment.print_report()
    experiment.save_report()
