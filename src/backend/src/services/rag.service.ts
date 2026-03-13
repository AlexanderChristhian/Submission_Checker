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

    return response.json() as Promise<SimilarityResult[]>;
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
