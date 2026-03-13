interface QueryResult {
    answer: string;
    sources: Array<{
        text: string;
        score: number;
    }>;
}
export interface SimilarityResult {
    submissionId: string;
    score: number;
    title: string;
}
declare class RagService {
    private baseUrl;
    constructor();
    indexDocument(submissionId: number, content: string): Promise<void>;
    query(submissionId: number, query: string): Promise<QueryResult>;
    findSimilar(submissionId: number, topK?: number): Promise<SimilarityResult[]>;
    healthCheck(): Promise<boolean>;
}
export declare const ragService: RagService;
export {};
//# sourceMappingURL=rag.service.d.ts.map