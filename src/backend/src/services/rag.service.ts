import { config } from "../config/index.js";
import { AppError } from "../utils/errors.js";

interface QueryResult {
  answer: string;
  sources: Array<{ text: string; score: number }>;
}

export interface SimilarityResult {
  submissionId: string;
  score: number;
  title: string;
}

interface GraphRAGResult {
  answer: string;
  chunks: Array<{ text: string; score: number; metadata: Record<string, unknown> }>;
  graph_context: Array<Record<string, unknown>>;
}

interface HybridGraphResult {
  results: Array<Record<string, unknown>>;
  vector_count: number;
  graph_count: number;
}

interface MultiStepResult {
  answer: string;
  sources: Array<{ text: string; score: number }>;
  sub_queries: string[];
  transform_type: string;
}

class RagService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.RAG_SERVICE_URL;
  }

  async indexDocument(submissionId: number, content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId, content }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new AppError(
        `RAG indexing failed: ${response.statusText}`,
        response.status
      );
    }
  }

  async query(submissionId: number, query: string): Promise<QueryResult> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId, query }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new AppError(
        `RAG query failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json() as Promise<QueryResult>;
  }

  async queryRag(query: string, topK: number = 5): Promise<QueryResult> {
    const response = await fetch(`${this.baseUrl}/query/rag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: topK }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new AppError(`RAG query failed: ${response.statusText}`, response.status);
    }

    return response.json() as Promise<QueryResult>;
  }

  async queryGraphRag(query: string, topK: number = 5): Promise<GraphRAGResult> {
    const response = await fetch(`${this.baseUrl}/query/graphrag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: topK }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new AppError(`GraphRAG query failed: ${response.statusText}`, response.status);
    }

    return response.json() as Promise<GraphRAGResult>;
  }

  async queryHybridGraph(
    query: string,
    topK: number = 5,
    fusion: "rrf" | "weighted" = "rrf",
    alpha?: number
  ): Promise<HybridGraphResult> {
    const body: Record<string, unknown> = { query, top_k: topK, fusion };
    if (alpha !== undefined) body.alpha = alpha;

    const response = await fetch(`${this.baseUrl}/query/hybrid-graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new AppError(
        `Hybrid graph query failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json() as Promise<HybridGraphResult>;
  }

  async queryHybrid(
    query: string,
    topK: number = 5,
    fusionMode: "reciprocal_rerank" | "relative_score" | "dist_based_score" = "reciprocal_rerank"
  ): Promise<QueryResult> {
    const response = await fetch(`${this.baseUrl}/query/hybrid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: topK, fusion_mode: fusionMode }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new AppError(
        `Hybrid query failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json() as Promise<QueryResult>;
  }

  async queryMultiStep(
    query: string,
    topK: number = 5,
    enableDecomposition: boolean = true,
    useHybrid: boolean = true
  ): Promise<MultiStepResult> {
    const response = await fetch(`${this.baseUrl}/query/multi-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        top_k: topK,
        enable_decomposition: enableDecomposition,
        use_hybrid: useHybrid,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new AppError(
        `Multi-step query failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json() as Promise<MultiStepResult>;
  }

  private async unwrapSimilarResponse(response: Response): Promise<SimilarityResult[]> {
    const body = await response.json() as { matches?: SimilarityResult[] };
    return body.matches ?? [];
  }

  async findSimilar(
    submissionId: number,
    topK: number = 10
  ): Promise<SimilarityResult[]> {
    const response = await fetch(`${this.baseUrl}/similar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId, top_k: topK }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new AppError(`Similarity search failed`, response.status);
    }

    return this.unwrapSimilarResponse(response);
  }

  async findSimilarByText(text: string, topK: number = 10): Promise<SimilarityResult[]> {
    const response = await fetch(`${this.baseUrl}/similar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, top_k: topK }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new AppError(`Similarity search failed`, response.status);
    }

    return this.unwrapSimilarResponse(response);
  }

  async evaluateSubmission(
    submissionId: number,
    content: string,
    assignmentTitle?: string,
    ruleContent?: string,
  ): Promise<{ score: number; deductions: string[] }> {
    const response = await fetch(`${this.baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submission_id: submissionId,
        content,
        assignment_title: assignmentTitle ?? "",
        rule_content: ruleContent ?? "",
      }),
      signal: AbortSignal.timeout(240000),
    });

    if (!response.ok) {
      throw new AppError(
        `Evaluation failed: ${response.statusText}`,
        response.status,
      );
    }

    return response.json() as Promise<{ score: number; deductions: string[] }>;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const ragService = new RagService();
