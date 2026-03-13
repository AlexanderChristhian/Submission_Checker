export declare const similarityGraph: {
    createSimilarEdge(submissionIdA: number, submissionIdB: number, score: number): Promise<void>;
    findSimilar(submissionId: number, minScore?: number): Promise<{
        matchId: number;
        matchTitle: string;
        score: number;
    }[]>;
    detectClusters(minScore?: number): Promise<{
        idA: number;
        idB: number;
        score: number;
    }[]>;
};
//# sourceMappingURL=similarity.graph.d.ts.map