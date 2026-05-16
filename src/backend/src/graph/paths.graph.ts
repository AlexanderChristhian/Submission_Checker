import { runQuery } from "./neo4j.client.js";

// ── Shortest Path Between Two Submissions ─────────────────────────────────
export interface ShortestPathResult {
  path: string[];
  distance: number;
}

export async function findShortestPath(
  submissionIdA: number,
  submissionIdB: number,
  relTypes: string[] = ["SIMILAR_TO"]
): Promise<ShortestPathResult | null> {
  const relPattern = relTypes.map((t) => `:${t}`).join("|");
  const result = await runQuery(
    `MATCH (a:Submission {submissionId: $idA}),
           (b:Submission {submissionId: $idB})
     MATCH p = shortestPath((a)-[${relPattern}*]-(b))
     RETURN [n IN nodes(p) | n.title] AS path, length(p) AS distance`,
    { idA: submissionIdA, idB: submissionIdB }
  );
  if (result.records.length === 0) return null;
  const r = result.records[0];
  return {
    path: r.get("path") as string[],
    distance: (r.get("distance") as number).toNumber(),
  };
}

// ── All Paths Between Two Students ────────────────────────────────────────
export interface StudentPath {
  path: string[];
  length: number;
  avgScore: number;
}

export async function findAllStudentPaths(
  studentIdA: number,
  studentIdB: number,
  maxHops: number = 5
): Promise<StudentPath[]> {
  const result = await runQuery(
    `MATCH (a:Student {studentId: $idA}), (b:Student {studentId: $idB})
     MATCH path = (a)-[:SUBMITTED|SIMILAR_TO*1..$maxHops]-(b)
     WHERE a <> b
     RETURN [n IN nodes(path) |
       CASE WHEN n:Submission THEN n.title ELSE n.name END
     ] AS path,
            length(path) AS length,
            reduce(s = 0.0, r IN relationships(path) |
              s + coalesce(r.score, 0.0)
            ) / length(path) AS avgScore
     ORDER BY length ASC, avgScore DESC`,
    { idA: studentIdA, idB: studentIdB, maxHops: Number(maxHops) }
  );
  return result.records.map((r) => ({
    path: r.get("path") as string[],
    length: (r.get("length") as number).toNumber(),
    avgScore: (r.get("avgScore") as number).toNumber?.(2) ?? (r.get("avgScore") as number),
  }));
}

// ── Similarity Chain from a Submission ────────────────────────────────────
export interface SimilarityChain {
  depth: number;
  chain: string[];
  pathScore: number;
}

export async function getSimilarityChain(
  submissionId: number,
  maxDepth: number = 5
): Promise<SimilarityChain[]> {
  const result = await runQuery(
    `MATCH path = (:Submission {submissionId: $submissionId})-[:SIMILAR_TO*1..$maxDepth]->(target:Submission)
     RETURN [n IN nodes(path) | n.title] AS chain,
            length(path) AS depth,
            reduce(s = 1.0, r IN relationships(path) | s * r.score) AS pathScore
     ORDER BY depth ASC, pathScore DESC`,
    { submissionId, maxDepth: Number(maxDepth) }
  );
  return result.records.map((r) => ({
    chain: r.get("chain") as string[],
    depth: (r.get("depth") as number).toNumber(),
    pathScore: (r.get("pathScore") as number).toNumber?.(4) ?? (r.get("pathScore") as number),
  }));
}

// ── Degree Centrality (Most Connected Submissions) ─────────────────────────
export interface CentralityResult {
  submissionId: number;
  title: string;
  connectionCount: number;
  avgSimilarity: number;
}

export async function getSubmissionCentrality(): Promise<CentralityResult[]> {
  const result = await runQuery(
    `MATCH (s:Submission)
     OPTIONAL MATCH (s)-[r:SIMILAR_TO]-()
     WITH s, count(r) AS connectionCount, avg(r.score) AS avgSimilarity
     RETURN s.submissionId AS submissionId,
            s.title AS title,
            connectionCount,
            coalesce(avgSimilarity, 0.0) AS avgSimilarity
     ORDER BY connectionCount DESC, avgSimilarity DESC`
  );
  return result.records.map((r) => ({
    submissionId: r.get("submissionId") as number,
    title: r.get("title") as string,
    connectionCount: (r.get("connectionCount") as number).toNumber(),
    avgSimilarity: (r.get("avgSimilarity") as number).toNumber?.(2) ?? 0,
  }));
}

// ── Connected Components (Isolated Clusters) ──────────────────────────────
export interface ConnectedComponent {
  componentId: number;
  submissions: string[];
  size: number;
}

export async function detectConnectedComponents(): Promise<ConnectedComponent[]> {
  const result = await runQuery(
    `MATCH (s:Submission)
     OPTIONAL MATCH (s)-[r:SIMILAR_TO]-(other:Submission)
     WITH s, count(r) AS degree
     WHERE degree = 0
     RETURN [s.title] AS submissions, 1 AS size, id(s) AS componentId
     UNION
     MATCH (a:Submission)-[:SIMILAR_TO*]-(b:Submission)
     WHERE id(a) < id(b)
     WITH a, collect(DISTINCT b) AS cluster
     WHERE size(cluster) > 0
     RETURN [a.title] + [n IN cluster | n.title] AS submissions,
            size(cluster) + 1 AS size,
            id(a) AS componentId
     ORDER BY size DESC`
  );
  return result.records.map((r) => ({
    componentId: (r.get("componentId") as number).toNumber(),
    submissions: r.get("submissions") as string[],
    size: (r.get("size") as number).toNumber(),
  }));
}

// ── Path Statistics Across Graph ─────────────────────────────────────────
export interface PathStats {
  totalPaths: number;
  minLength: number;
  maxLength: number;
  avgLength: number;
}

export async function getPathStats(): Promise<PathStats> {
  const result = await runQuery(
    `MATCH (a:Submission)-[r:SIMILAR_TO]->(b:Submission)
     WITH a, b, collect(r) AS rels
     WITH a, b, size(rels) AS edgeCount
     RETURN count(*) AS totalPaths,
            min(edgeCount) AS minLength,
            max(edgeCount) AS maxLength,
            avg(edgeCount) AS avgLength`
  );
  const r = result.records[0];
  return {
    totalPaths: (r.get("totalPaths") as number).toNumber(),
    minLength: (r.get("minLength") as number).toNumber(),
    maxLength: (r.get("maxLength") as number).toNumber(),
    avgLength: (r.get("avgLength") as number).toNumber?.(2) ?? 0,
  };
}

// ── Most Central Student (hub score) ──────────────────────────────────────
export interface StudentHubScore {
  studentId: number;
  name: string;
  submissionCount: number;
  similarityConnections: number;
}

export async function getStudentHubScores(): Promise<StudentHubScore[]> {
  const result = await runQuery(
    `MATCH (s:Student)
     OPTIONAL MATCH (s)-[:SUBMITTED]->(sub:Submission)
     OPTIONAL MATCH (sub)-[r:SIMILAR_TO]-()
     WITH s, count(DISTINCT sub) AS submissionCount, count(r) AS similarityConnections
     RETURN s.studentId AS studentId, s.name AS name,
            submissionCount, similarityConnections
     ORDER BY similarityConnections DESC, submissionCount DESC`
  );
  return result.records.map((r) => ({
    studentId: r.get("studentId") as number,
    name: r.get("name") as string,
    submissionCount: (r.get("submissionCount") as number).toNumber(),
    similarityConnections: (r.get("similarityConnections") as number).toNumber(),
  }));
}
