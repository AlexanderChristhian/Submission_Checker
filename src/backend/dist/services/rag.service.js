import { config } from "../config/index.js";
import { AppError } from "../utils/errors.js";
class RagService {
    baseUrl;
    constructor() {
        this.baseUrl = config.RAG_SERVICE_URL;
    }
    async indexDocument(submissionId, content) {
        const response = await fetch(`${this.baseUrl}/index`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submission_id: submissionId, content }),
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
            throw new AppError(`RAG indexing failed: ${response.statusText}`, response.status);
        }
    }
    async query(submissionId, query) {
        const response = await fetch(`${this.baseUrl}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submission_id: submissionId, query }),
            signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) {
            throw new AppError(`RAG query failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    async queryRag(query, topK = 5) {
        const response = await fetch(`${this.baseUrl}/query/rag`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, top_k: topK }),
            signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) {
            throw new AppError(`RAG query failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    async queryGraphRag(query, topK = 5) {
        const response = await fetch(`${this.baseUrl}/query/graphrag`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, top_k: topK }),
            signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) {
            throw new AppError(`GraphRAG query failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    async queryHybridGraph(query, topK = 5, fusion = "rrf", alpha) {
        const body = { query, top_k: topK, fusion };
        if (alpha !== undefined)
            body.alpha = alpha;
        const response = await fetch(`${this.baseUrl}/query/hybrid-graph`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) {
            throw new AppError(`Hybrid graph query failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    async queryHybrid(query, topK = 5, fusionMode = "reciprocal_rerank") {
        const response = await fetch(`${this.baseUrl}/query/hybrid`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, top_k: topK, fusion_mode: fusionMode }),
            signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) {
            throw new AppError(`Hybrid query failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    async queryMultiStep(query, topK = 5, enableDecomposition = true, useHybrid = true) {
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
            throw new AppError(`Multi-step query failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    async unwrapSimilarResponse(response) {
        const body = await response.json();
        return body.matches ?? [];
    }
    async findSimilar(submissionId, topK = 10) {
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
    async findSimilarByText(text, topK = 10) {
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
    async evaluateSubmission(submissionId, content, assignmentTitle, ruleContent) {
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
            throw new AppError(`Evaluation failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
export const ragService = new RagService();
//# sourceMappingURL=rag.service.js.map