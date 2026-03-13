import { similarityGraph } from "../graph/similarity.graph.js";
import { submissionGraph } from "../graph/submission.graph.js";
import { ragService } from "./rag.service.js";
import { logger } from "../utils/logger.js";
export const plagiarismService = {
    async createNode(submissionId, title) {
        await submissionGraph.createNode(submissionId, title);
    },
    async checkSimilarity(submissionId) {
        // 1. Get similarity results from RAG service (vector similarity)
        const matches = await ragService.findSimilar(submissionId);
        // 2. Store relationships in Neo4j graph
        for (const match of matches) {
            await similarityGraph.createSimilarEdge(submissionId, Number(match.submissionId), match.score);
            logger.info({ submissionId, matchId: match.submissionId, score: match.score }, "Similarity edge created");
        }
        return matches;
    },
    async getSimilarSubmissions(submissionId, minScore = 0.7) {
        return similarityGraph.findSimilar(submissionId, minScore);
    },
    async getClusters(minScore = 0.8) {
        return similarityGraph.detectClusters(minScore);
    },
};
//# sourceMappingURL=plagiarism.service.js.map