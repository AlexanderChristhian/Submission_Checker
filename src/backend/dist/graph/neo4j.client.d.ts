import type { QueryResult, RecordShape } from "neo4j-driver";
export declare function runQuery<T extends RecordShape = RecordShape>(cypher: string, params?: Record<string, unknown>): Promise<QueryResult<T>>;
//# sourceMappingURL=neo4j.client.d.ts.map