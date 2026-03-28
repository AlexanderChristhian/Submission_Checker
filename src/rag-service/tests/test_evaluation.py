"""
RAG Evaluation Pipeline for Submission Checker

This module evaluates the RAG system's performance using:
- Retrieval metrics: Hit Rate, MRR, Precision@k
- Generation metrics: Faithfulness, Relevancy
- End-to-end metrics: Task Success Rate, Latency
"""

import asyncio
import json
import time
from typing import Dict, List, Tuple, Any
import numpy as np
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from llama_index.core.evaluation import (
    FaithfulnessEvaluator,
    RelevancyEvaluator,
    RetrieverEvaluator,
    BatchEvalRunner,
)
from llama_index.llms.openai import OpenAI

from app.main import app
from app.config import settings

# ── Test Client ───────────────────────────────────────────
client = TestClient(app)

# ── Evaluation Dataset ───────────────────────────────────
EVALUATION_DATASET = {
    "queries": [
        "How does the submission checker detect plagiarism?",
        "What database does the system use for storing submissions?",
        "How are code submissions compared for similarity?",
        "What is the chunking strategy used for code documents?",
        "How does the hybrid search combine vector and keyword search?",
        "What embedding model is used for code representation?",
        "How are query results ranked and filtered?",
        "What API endpoints are available for similarity search?",
        "How does the multi-step query decomposition work?",
        "What is the response synthesis strategy?",
    ],
    "expected_sources": [
        ["similarity.py", "embeddings.py", "vector_store.py"],
        ["neo4j_driver.py", "database.py", "config.py"],
        ["comparison.py", "similarity.py", "retrievers"],
        ["splitters.py", "indexing.py", "chunking"],
        ["hybrid_retriever.py", "bm25_retriever.py"],
        ["embeddings.py", "huggingface.py"],
        ["retrievers", "querying.py", "ranking.py"],
        ["routes.py", "api", "endpoints"],
        ["multi_step_query_service.py", "query_transform_service.py"],
        ["response_synthesizer_service.py", "synthesis.py"],
    ],
    "expected_keywords": [
        ["cosine similarity", "embeddings", "vector", "plagiarism"],
        ["Neo4j", "graph database", "Cypher", "connection"],
        ["vector", "similarity", "comparison", "matching"],
        ["chunking", "splitting", "overlap", "token"],
        ["hybrid", "BM25", "fusion", "reciprocal rank"],
        ["embedding", "model", "code", "representation"],
        ["ranking", "filtering", "threshold", "score"],
        ["API", "endpoint", "similarity", "search"],
        ["decomposition", "sub-query", "multi-step", "transform"],
        ["synthesis", "response", "compact", "refine"],
    ],
}

# ── Retrieval Evaluation ─────────────────────────────────
class RAGEvaluator:
    """Comprehensive RAG evaluation pipeline."""
    
    def __init__(self, use_mock_llm: bool = True):
        """
        Initialize evaluator.
        
        Args:
            use_mock_llm: If True, use mock LLM for evaluation (no API calls)
        """
        self.use_mock_llm = use_mock_llm
        if not use_mock_llm:
            self.llm = OpenAI(model="gpt-4", temperature=0)
            self.faithfulness_eval = FaithfulnessEvaluator(llm=self.llm)
            self.relevancy_eval = RelevancyEvaluator(llm=self.llm)
        else:
            self.faithfulness_eval = None
            self.relevancy_eval = None
        
        self.results = {
            "retrieval": {},
            "generation": {},
            "latency": {},
            "sample_results": [],
        }
    
    async def evaluate_retrieval(
        self,
        queries: List[str],
        expected_sources: List[List[str]],
    ) -> Dict[str, float]:
        """
        Evaluate retrieval performance.
        
        Metrics:
        - Hit Rate: % of queries where expected source appears in top-k
        - MRR: Mean Reciprocal Rank of first relevant result
        - Precision@k: Fraction of retrieved docs that are relevant
        """
        hit_count = 0
        mrr_sum = 0.0
        precision_sum = 0.0
        
        for i, (query, expected) in enumerate(zip(queries, expected_sources)):
            # Call RAG endpoint
            start_time = time.time()
            response = client.post(
                "/query/hybrid",
                json={
                    "query": query,
                    "top_k": 10,
                    "num_queries": 2,
                    "fusion_mode": "reciprocal_rerank",
                },
            )
            latency = time.time() - start_time
            
            if response.status_code != 200:
                print(f"Query {i} failed: {response.status_code}")
                continue
            
            data = response.json()
            sources = data.get("sources", [])
            retrieved_names = [s.get("text", "")[:100] for s in sources]
            
            # Calculate metrics
            found_positions = []
            for j, retrieved in enumerate(retrieved_names):
                for exp_source in expected:
                    if exp_source.lower() in retrieved.lower():
                        found_positions.append(j + 1)
                        break
            
            # Hit Rate
            if found_positions:
                hit_count += 1
            
            # MRR
            if found_positions:
                mrr_sum += 1.0 / min(found_positions)
            
            # Precision@k (k=10)
            relevant_count = len(found_positions)
            precision_sum += relevant_count / len(retrieved_names) if retrieved_names else 0
            
            # Store sample result
            self.results["sample_results"].append({
                "query": query,
                "expected_sources": expected,
                "retrieved": retrieved_names[:5],
                "latency": latency,
                "found": bool(found_positions),
            })
        
        n = len(queries)
        results = {
            "hit_rate": hit_count / n if n > 0 else 0,
            "mrr": mrr_sum / n if n > 0 else 0,
            "precision_at_10": precision_sum / n if n > 0 else 0,
            "total_queries": n,
            "successful_queries": hit_count,
        }
        
        self.results["retrieval"] = results
        return results
    
    async def evaluate_generation_mock(
        self,
        queries: List[str],
        expected_keywords: List[List[str]],
    ) -> Dict[str, float]:
        """
        Evaluate generation quality using keyword matching (mock evaluation).
        
        This is a simplified version that doesn't require LLM API calls.
        For production, use LlamaIndex evaluators with actual LLM.
        """
        faithfulness_scores = []
        relevancy_scores = []
        
        for i, (query, keywords) in enumerate(zip(queries, expected_keywords)):
            # Query RAG system
            response = client.post(
                "/query/rag",
                json={"query": query, "top_k": 5},
            )
            
            if response.status_code != 200:
                continue
            
            data = response.json()
            answer = data.get("answer", "").lower()
            
            # Simple faithfulness check: do keywords appear in answer?
            keyword_hits = sum(1 for kw in keywords if kw.lower() in answer)
            faithfulness = keyword_hits / len(keywords) if keywords else 0
            faithfulness_scores.append(faithfulness)
            
            # Simple relevancy check: answer length and keyword presence
            relevancy = min(1.0, (len(answer) / 100) * faithfulness)
            relevancy_scores.append(relevancy)
        
        results = {
            "faithfulness": np.mean(faithfulness_scores) if faithfulness_scores else 0,
            "relevancy": np.mean(relevancy_scores) if relevancy_scores else 0,
            "hallucination_rate": 1 - np.mean(faithfulness_scores) if faithfulness_scores else 0,
            "total_evaluated": len(faithfulness_scores),
        }
        
        self.results["generation"] = results
        return results
    
    async def evaluate_latency(
        self,
        queries: List[str],
    ) -> Dict[str, float]:
        """Evaluate query latency."""
        latencies = []
        
        for query in queries:
            start_time = time.time()
            response = client.post(
                "/query/rag",
                json={"query": query, "top_k": 5},
            )
            latency = time.time() - start_time
            
            if response.status_code == 200:
                latencies.append(latency)
        
        if latencies:
            results = {
                "avg_latency": np.mean(latencies),
                "p50_latency": np.percentile(latencies, 50),
                "p95_latency": np.percentile(latencies, 95),
                "p99_latency": np.percentile(latencies, 99),
                "max_latency": np.max(latencies),
                "min_latency": np.min(latencies),
            }
        else:
            results = {
                "avg_latency": 0,
                "p50_latency": 0,
                "p95_latency": 0,
                "p99_latency": 0,
                "max_latency": 0,
                "min_latency": 0,
            }
        
        self.results["latency"] = results
        return results
    
    def calculate_overall_score(self) -> float:
        """Calculate weighted overall score."""
        weights = {
            "hit_rate": 0.25,
            "mrr": 0.20,
            "precision_at_10": 0.15,
            "faithfulness": 0.20,
            "relevancy": 0.10,
            "latency_score": 0.10,
        }
        
        # Normalize latency (lower is better, target < 2s)
        latency_score = max(0, 1 - (self.results["latency"].get("avg_latency", 0) / 2))
        
        score = 0
        if self.results["retrieval"]:
            score += weights["hit_rate"] * self.results["retrieval"].get("hit_rate", 0)
            score += weights["mrr"] * self.results["retrieval"].get("mrr", 0)
            score += weights["precision_at_10"] * self.results["retrieval"].get("precision_at_10", 0)
        
        if self.results["generation"]:
            score += weights["faithfulness"] * self.results["generation"].get("faithfulness", 0)
            score += weights["relevancy"] * self.results["generation"].get("relevancy", 0)
        
        score += weights["latency_score"] * latency_score
        
        return round(score * 100, 2)  # Convert to percentage
    
    def print_report(self):
        """Print comprehensive evaluation report."""
        print("\n" + "="*60)
        print("RAG EVALUATION REPORT")
        print("="*60)
        
        print("\n📊 RETRIEVAL METRICS")
        print("-"*40)
        if self.results["retrieval"]:
            for metric, value in self.results["retrieval"].items():
                if isinstance(value, float):
                    print(f"  {metric:20} {value:.3f}")
                else:
                    print(f"  {metric:20} {value}")
        
        print("\n📝 GENERATION METRICS")
        print("-"*40)
        if self.results["generation"]:
            for metric, value in self.results["generation"].items():
                if isinstance(value, float):
                    print(f"  {metric:20} {value:.3f}")
                else:
                    print(f"  {metric:20} {value}")
        
        print("\n⏱️ LATENCY METRICS")
        print("-"*40)
        if self.results["latency"]:
            for metric, value in self.results["latency"].items():
                print(f"  {metric:20} {value:.3f}s")
        
        print("\n🎯 OVERALL SCORE")
        print("-"*40)
        overall = self.calculate_overall_score()
        print(f"  Score: {overall:.1f}%")
        
        if overall >= 80:
            print("  Rating: ✅ Excellent")
        elif overall >= 70:
            print("  Rating: ✅ Good")
        elif overall >= 60:
            print("  Rating: ⚠️ Fair")
        else:
            print("  Rating: ❌ Needs Improvement")
        
        print("\n📋 SAMPLE RESULTS")
        print("-"*40)
        for i, sample in enumerate(self.results["sample_results"][:3]):
            print(f"\n  Query {i+1}: {sample['query'][:50]}...")
            print(f"  Found: {'✅' if sample['found'] else '❌'}")
            print(f"  Latency: {sample['latency']:.2f}s")
        
        print("\n" + "="*60)
    
    def save_results(self, filepath: str = "evaluation_results.json"):
        """Save results to JSON file."""
        output = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "overall_score": self.calculate_overall_score(),
            "retrieval_metrics": self.results["retrieval"],
            "generation_metrics": self.results["generation"],
            "latency_metrics": self.results["latency"],
            "sample_results": self.results["sample_results"],
            "dataset_size": len(EVALUATION_DATASET["queries"]),
        }
        
        with open(filepath, "w") as f:
            json.dump(output, f, indent=2)
        
        print(f"\n💾 Results saved to {filepath}")


# ── Pytest Tests ─────────────────────────────────────────
@pytest.mark.asyncio
async def test_retrieval_metrics():
    """Test retrieval metrics calculation."""
    evaluator = RAGEvaluator(use_mock_llm=True)
    
    results = await evaluator.evaluate_retrieval(
        queries=EVALUATION_DATASET["queries"][:3],  # Test with 3 queries
        expected_sources=EVALUATION_DATASET["expected_sources"][:3],
    )
    
    assert "hit_rate" in results
    assert "mrr" in results
    assert "precision_at_10" in results
    assert 0 <= results["hit_rate"] <= 1
    assert 0 <= results["mrr"] <= 1


@pytest.mark.asyncio
async def test_generation_metrics():
    """Test generation metrics calculation."""
    evaluator = RAGEvaluator(use_mock_llm=True)
    
    results = await evaluator.evaluate_generation_mock(
        queries=EVALUATION_DATASET["queries"][:3],
        expected_keywords=EVALUATION_DATASET["expected_keywords"][:3],
    )
    
    assert "faithfulness" in results
    assert "relevancy" in results
    assert "hallucination_rate" in results
    assert 0 <= results["faithfulness"] <= 1


@pytest.mark.asyncio
async def test_latency_metrics():
    """Test latency metrics calculation."""
    evaluator = RAGEvaluator(use_mock_llm=True)
    
    results = await evaluator.evaluate_latency(
        queries=EVALUATION_DATASET["queries"][:3],
    )
    
    assert "avg_latency" in results
    assert results["avg_latency"] > 0


# ── Main Evaluation Script ──────────────────────────────
async def run_full_evaluation():
    """Run complete evaluation pipeline."""
    print("🚀 Starting RAG Evaluation...")
    
    evaluator = RAGEvaluator(use_mock_llm=True)
    
    # 1. Evaluate retrieval
    print("\n1️⃣ Evaluating retrieval metrics...")
    await evaluator.evaluate_retrieval(
        queries=EVALUATION_DATASET["queries"],
        expected_sources=EVALUATION_DATASET["expected_sources"],
    )
    
    # 2. Evaluate generation
    print("2️⃣ Evaluating generation metrics...")
    await evaluator.evaluate_generation_mock(
        queries=EVALUATION_DATASET["queries"],
        expected_keywords=EVALUATION_DATASET["expected_keywords"],
    )
    
    # 3. Evaluate latency
    print("3️⃣ Evaluating latency metrics...")
    await evaluator.evaluate_latency(
        queries=EVALUATION_DATASET["queries"],
    )
    
    # 4. Generate report
    evaluator.print_report()
    
    # 5. Save results
    evaluator.save_results("evaluation_results.json")
    
    return evaluator.results


# ── Command Line Interface ──────────────────────────────
if __name__ == "__main__":
    """Run evaluation from command line."""
    import sys
    
    # Check if RAG service is running
    try:
        response = client.get("/health")
        if response.status_code != 200:
            print("❌ RAG service is not running. Please start it first.")
            print("   Run: uvicorn app.main:app --reload")
            sys.exit(1)
    except Exception:
        print("❌ Cannot connect to RAG service. Please start it first.")
        print("   Run: uvicorn app.main:app --reload")
        sys.exit(1)
    
    # Run evaluation
    asyncio.run(run_full_evaluation())