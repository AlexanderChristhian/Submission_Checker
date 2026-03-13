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