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
interface GraphRAGResult {
    answer: string;
    chunks: Array<{
        text: string;
        score: number;
        metadata: Record<string, unknown>;
    }>;
    graph_context: Array<Record<string, unknown>>;
}
interface HybridGraphResult {
    results: Array<Record<string, unknown>>;
    vector_count: number;
    graph_count: number;
}
interface MultiStepResult {
    answer: string;
    sources: Array<{
        text: string;
        score: number;
    }>;
    sub_queries: string[];
    transform_type: string;
}
declare class RagService {
    private baseUrl;
    constructor();
    indexDocument(submissionId: number, content: string): Promise<void>;
    query(submissionId: number, query: string): Promise<QueryResult>;
    queryRag(query: string, topK?: number): Promise<QueryResult>;
    queryGraphRag(query: string, topK?: number): Promise<GraphRAGResult>;
    queryHybridGraph(query: string, topK?: number, fusion?: "rrf" | "weighted", alpha?: number): Promise<HybridGraphResult>;
    queryHybrid(query: string, topK?: number, fusionMode?: "reciprocal_rerank" | "relative_score" | "dist_based_score"): Promise<QueryResult>;
    queryMultiStep(query: string, topK?: number, enableDecomposition?: boolean, useHybrid?: boolean): Promise<MultiStepResult>;
    private unwrapSimilarResponse;
    findSimilar(submissionId: number, topK?: number): Promise<SimilarityResult[]>;
    findSimilarByText(text: string, topK?: number): Promise<SimilarityResult[]>;
    evaluateSubmission(submissionId: number, content: string, assignmentTitle?: string, ruleContent?: string): Promise<{
        score: number;
        deductions: string[];
    }>;
    healthCheck(): Promise<boolean>;
}
export declare const ragService: RagService;
export {};
//# sourceMappingURL=rag.service.d.ts.map