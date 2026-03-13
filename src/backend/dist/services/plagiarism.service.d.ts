export declare const plagiarismService: {
    createNode(submissionId: number, title: string): Promise<void>;
    checkSimilarity(submissionId: number): Promise<import("./rag.service.js").SimilarityResult[]>;
    getSimilarSubmissions(submissionId: number, minScore?: number): Promise<{
        matchId: number;
        matchTitle: string;
        score: number;
    }[]>;
    getClusters(minScore?: number): Promise<{
        idA: number;
        idB: number;
        score: number;
    }[]>;
};
//# sourceMappingURL=plagiarism.service.d.ts.map