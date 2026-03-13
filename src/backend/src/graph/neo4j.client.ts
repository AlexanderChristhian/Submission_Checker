import { getNeo4jDriver } from "../config/neo4j.js";
import type { QueryResult, RecordShape } from "neo4j-driver";

export async function runQuery<T extends RecordShape = RecordShape>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<QueryResult<T>> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    return await session.run<T>(cypher, params);
  } finally {
    await session.close();
  }
}
