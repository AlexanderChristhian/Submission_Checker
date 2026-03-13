import { runQuery } from "./neo4j.client.js";
export const similarityGraph = {
    async createSimilarEdge(submissionIdA, submissionIdB, score) {
        await runQuery(`MATCH (a:Submission {submissionId: $submissionIdA})
       MATCH (b:Submission {submissionId: $submissionIdB})
       MERGE (a)-[r:SIMILAR_TO]->(b)
       SET r.score = $score, r.detectedAt = datetime()`, { submissionIdA, submissionIdB, score });
    },
    async findSimilar(submissionId, minScore = 0.7) {
        const result = await runQuery(`MATCH (s:Submission {submissionId: $submissionId})-[r:SIMILAR_TO]-(other:Submission)
       WHERE r.score >= $minScore
       RETURN other.submissionId AS matchId, other.title AS matchTitle, r.score AS score
       ORDER BY r.score DESC`, { submissionId, minScore });
        return result.records.map((record) => ({
            matchId: record.get("matchId"),
            matchTitle: record.get("matchTitle"),
            score: record.get("score"),
        }));
    },
    async detectClusters(minScore = 0.8) {
        const result = await runQuery(`MATCH (a:Submission)-[r:SIMILAR_TO]->(b:Submission)
       WHERE r.score >= $minScore
       RETURN a.submissionId AS idA, b.submissionId AS idB, r.score AS score
       ORDER BY r.score DESC`, { minScore });
        return result.records.map((record) => ({
            idA: record.get("idA"),
            idB: record.get("idB"),
            score: record.get("score"),
        }));
    },
};
//# sourceMappingURL=similarity.graph.js.map