import { runQuery } from "./neo4j.client.js";

// ── Node Counts (MATCH + RETURN + count) ──────────────────────────────────
export interface NodeCount {
  label: string;
  count: number;
}

export async function getNodeCounts(): Promise<NodeCount[]> {
  const result = await runQuery(
    `MATCH (n)
     RETURN labels(n)[0] AS label, count(n) AS count
     ORDER BY count DESC`
  );
  return result.records.map((r) => ({
    label: r.get("label") as string,
    count: (r.get("count") as number).toNumber(),
  }));
}

// ── Similarity Score Distribution (MATCH + WHERE + RETURN) ────────────────
export interface ScoreBucket {
  bucket: string;
  count: number;
}

export async function getSimilarityDistribution(): Promise<ScoreBucket[]> {
  const result = await runQuery(
    `MATCH ()-[r:SIMILAR_TO]->()
     WITH r.score AS score
     RETURN
       CASE
         WHEN score >= 0.9 THEN "0.90-1.00"
         WHEN score >= 0.8 THEN "0.80-0.89"
         WHEN score >= 0.7 THEN "0.70-0.79"
         WHEN score >= 0.6 THEN "0.60-0.69"
         ELSE "0.00-0.59"
       END AS bucket,
       count(*) AS count
     ORDER BY bucket DESC`
  );
  return result.records.map((r) => ({
    bucket: r.get("bucket") as string,
    count: (r.get("count") as number).toNumber(),
  }));
}

// ── Plagiarism Clusters (multi-hop MATCH + WHERE + collect) ────────────────
export interface PlagiarismCluster {
  submissions: Array<{ id: number; title: string }>;
  avgScore: number;
  size: number;
}

export async function detectPlagiarismClusters(
  minScore: number = 0.8
): Promise<PlagiarismCluster[]> {
  const result = await runQuery(
    `MATCH (a:Submission)-[r:SIMILAR_TO]->(b:Submission)
     WHERE r.score >= $minScore
     WITH a, b, r
     ORDER BY r.score DESC
     WITH a AS root
     MATCH (root)-[:SIMILAR_TO*1..3]-(connected:Submission)
     WHERE connected.submissionId >= root.submissionId
     WITH root, collect(DISTINCT connected) AS cluster
     WHERE size(cluster) > 1
     RETURN
       [s IN cluster | {id: s.submissionId, title: s.title}] AS submissions,
       reduce(s = 0.0, x IN cluster |
         s + reduce(t = 0.0, y IN [(x)-[r:SIMILAR_TO]-(c IN cluster) WHERE c <> x | r.score] |
           t + y
         ) / size([y IN [(x)-[r:SIMILAR_TO]-(c IN cluster) WHERE c <> x | r.score] | y])
       ) / size(cluster) AS avgScore,
       size(cluster) AS size
     ORDER BY size DESC, avgScore DESC`,
    { minScore }
  );
  return result.records.map((r) => ({
    submissions: r.get("submissions") as Array<{ id: number; title: string }>,
    avgScore: (r.get("avgScore") as number).toNumber?.(2) ?? (r.get("avgScore") as number),
    size: (r.get("size") as number).toNumber(),
  }));
}

// ── Student Submission Graph (multi-hop MATCH + WHERE) ────────────────────
export interface StudentGraph {
  submissions: Array<{ id: number; title: string; score: number }>;
  similar: Array<{ submissionId: number; title: string; score: number }>;
}

export async function getStudentSubmissionGraph(
  studentId: number
): Promise<StudentGraph> {
  const submissionsResult = await runQuery(
    `MATCH (s:Student {studentId: $studentId})-[r:SUBMITTED]->(sub:Submission)
     RETURN sub.submissionId AS id, sub.title AS title, r.score AS score
     ORDER BY r.score DESC`,
    { studentId }
  );

  const similarResult = await runQuery(
    `MATCH (s:Student {studentId: $studentId})
           -[:SUBMITTED]->(sub:Submission)
           -[sim:SIMILAR_TO]-(other:Submission)
     WHERE sim.score >= 0.5
     RETURN other.submissionId AS submissionId,
            other.title AS title,
            sim.score AS score
     ORDER BY sim.score DESC`,
    { studentId }
  );

  return {
    submissions: submissionsResult.records.map((r) => ({
      id: r.get("id") as number,
      title: r.get("title") as string,
      score: r.get("score") as number,
    })),
    similar: similarResult.records.map((r) => ({
      submissionId: r.get("submissionId") as number,
      title: r.get("title") as string,
      score: r.get("score") as number,
    })),
  };
}

// ── Top Similar Pairs (MATCH + WHERE + ORDER BY + LIMIT) ─────────────────
export interface SimilarPair {
  idA: number;
  titleA: string;
  idB: number;
  titleB: string;
  score: number;
}

export async function getTopSimilarPairs(
  limit: number = 20,
  minScore: number = 0.5
): Promise<SimilarPair[]> {
  const result = await runQuery(
    `MATCH (a:Submission)-[r:SIMILAR_TO]->(b:Submission)
     WHERE r.score >= $minScore
     RETURN a.submissionId AS idA, a.title AS titleA,
            b.submissionId AS idB, b.title AS titleB,
            r.score AS score
     ORDER BY r.score DESC
     LIMIT $limit`,
    { minScore, limit: Number(limit) }
  );
  return result.records.map((r) => ({
    idA: r.get("idA") as number,
    titleA: r.get("titleA") as string,
    idB: r.get("idB") as number,
    titleB: r.get("titleB") as string,
    score: r.get("score") as number,
  }));
}

// ── Submissions by Score Range (MATCH + WHERE comparison) ──────────────────
export interface SubmissionScoreRow {
  submissionId: number;
  title: string;
  score: number;
  studentName: string;
}

export async function getSubmissionsByScoreRange(
  minScore: number,
  maxScore: number
): Promise<SubmissionScoreRow[]> {
  const result = await runQuery(
    `MATCH (s:Student)-[sub:SUBMITTED]->(submission:Submission)
     WHERE sub.score >= $minScore AND sub.score <= $maxScore
     RETURN submission.submissionId AS submissionId,
            submission.title AS title,
            sub.score AS score,
            s.name AS studentName
     ORDER BY sub.score DESC`,
    { minScore, maxScore }
  );
  return result.records.map((r) => ({
    submissionId: r.get("submissionId") as number,
    title: r.get("title") as string,
    score: r.get("score") as number,
    studentName: r.get("studentName") as string,
  }));
}

// ── Course Similarity Report (complex path MATCH + WHERE) ──────────────────
export interface CourseSimilarityReport {
  courseCode: string;
  totalSubmissions: number;
  flaggedPairs: number;
  avgSimilarity: number;
  pairs: SimilarPair[];
}

export async function getCourseSimilarityReport(
  courseCode: string,
  flagThreshold: number = 0.7
): Promise<CourseSimilarityReport> {
  const metaResult = await runQuery(
    `MATCH (c:Course {code: $courseCode})<-[:ENROLLED_IN]-(s:Student)
           -[:SUBMITTED]->(sub:Submission)
     RETURN count(DISTINCT sub) AS totalSubmissions`,
    { courseCode }
  );

  const pairsResult = await runQuery(
    `MATCH (c:Course {code: $courseCode})<-[:ENROLLED_IN]-(:Student)
           -[:SUBMITTED]->(a:Submission)
           -[r:SIMILAR_TO]->(b:Submission)
           <-[:SUBMITTED]-(:Student)-[:ENROLLED_IN]->(c)
     WHERE r.score >= $flagThreshold
     RETURN DISTINCT a.submissionId AS idA, a.title AS titleA,
            b.submissionId AS idB, b.title AS titleB,
            r.score AS score
     ORDER BY r.score DESC`,
    { courseCode, flagThreshold }
  );

  const totalSubmissions = metaResult.records[0]
    ? (metaResult.records[0].get("totalSubmissions") as number).toNumber()
    : 0;

  const pairs = pairsResult.records.map((r) => ({
    idA: r.get("idA") as number,
    titleA: r.get("titleA") as string,
    idB: r.get("idB") as number,
    titleB: r.get("titleB") as string,
    score: r.get("score") as number,
  }));

  const avgSimilarity =
    pairs.length > 0
      ? pairs.reduce((sum, p) => sum + p.score, 0) / pairs.length
      : 0;

  return {
    courseCode,
    totalSubmissions,
    flaggedPairs: pairs.length,
    avgSimilarity: Math.round(avgSimilarity * 100) / 100,
    pairs,
  };
}

// ── Search Nodes by Property (MATCH + WHERE CONTAINS / STARTS WITH) ──────
export interface SearchResult {
  label: string;
  properties: Record<string, unknown>;
}

export async function searchNodes(
  property: string,
  query: string,
  mode: "contains" | "startsWith" = "contains"
): Promise<SearchResult[]> {
  const operator = mode === "contains" ? "CONTAINS" : "STARTS WITH";
  const result = await runQuery(
    `MATCH (n)
     WHERE n.${property} ${operator} $query
     RETURN labels(n)[0] AS label, n{.*} AS props
     LIMIT 50`,
    { query }
  );
  return result.records.map((r) => ({
    label: r.get("label") as string,
    properties: r.get("props") as Record<string, unknown>,
  }));
}

// ── Students with Multiple Highly-Similar Submissions (aggregation) ───────
export interface FlaggedStudent {
  studentId: number;
  name: string;
  flaggedCount: number;
  avgSimilarity: number;
}

export async function getFlaggedStudents(
  minScore: number = 0.8
): Promise<FlaggedStudent[]> {
  const result = await runQuery(
    `MATCH (s:Student)-[:SUBMITTED]->(sub:Submission)
           -[r:SIMILAR_TO]-(:Submission)
     WHERE r.score >= $minScore
     WITH s, collect(DISTINCT r.score) AS scores
     RETURN s.studentId AS studentId, s.name AS name,
            size(scores) AS flaggedCount,
            reduce(total = 0.0, x IN scores | total + x) / size(scores) AS avgSimilarity
     ORDER BY flaggedCount DESC, avgSimilarity DESC`,
    { minScore }
  );
  return result.records.map((r) => ({
    studentId: r.get("studentId") as number,
    name: r.get("name") as string,
    flaggedCount: (r.get("flaggedCount") as number).toNumber(),
    avgSimilarity:
      Math.round(((r.get("avgSimilarity") as number).toNumber?.() ?? (r.get("avgSimilarity") as number)) * 100) / 100,
  }));
}

// ── Graph-Wide Aggregate Statistics ───────────────────────────────────────
export interface GraphStats {
  nodeCount: number;
  relationshipCount: number;
  avgSimilarityScore: number;
  maxSimilarityScore: number;
  minSimilarityScore: number;
  standardDeviation: number;
}

export async function getGraphStats(): Promise<GraphStats> {
  const nodeCount = await runQuery(`MATCH (n) RETURN count(n) AS count`);
  const relCount = await runQuery(`MATCH ()-[r]->() RETURN count(r) AS count`);
  const simStats = await runQuery(
    `MATCH ()-[r:SIMILAR_TO]->()
     RETURN avg(r.score) AS avg,
            max(r.score) AS max,
            min(r.score) AS min,
            stdev(r.score) AS std`
  );

  const simR = simStats.records[0];
  return {
    nodeCount: (nodeCount.records[0]?.get("count") as number).toNumber(),
    relationshipCount: (relCount.records[0]?.get("count") as number).toNumber(),
    avgSimilarityScore: (simR?.get("avg") as number)?.toNumber?.(4) ?? 0,
    maxSimilarityScore: (simR?.get("max") as number) ?? 0,
    minSimilarityScore: (simR?.get("min") as number) ?? 0,
    standardDeviation: (simR?.get("std") as number)?.toNumber?.(4) ?? 0,
  };
}

// ── Relationship Type Counts ──────────────────────────────────────────────
export interface RelTypeCount {
  type: string;
  count: number;
}

export async function getRelationshipTypeCounts(): Promise<RelTypeCount[]> {
  const result = await runQuery(
    `MATCH ()-[r]->()
     RETURN type(r) AS type, count(*) AS count
     ORDER BY count DESC`
  );
  return result.records.map((r) => ({
    type: r.get("type") as string,
    count: (r.get("count") as number).toNumber(),
  }));
}

// ── Submission Score Percentiles ──────────────────────────────────────────
export interface ScorePercentile {
  percentile: string;
  minScore: number;
  maxScore: number;
}

export async function getSubmissionScorePercentiles(): Promise<ScorePercentile[]> {
  const result = await runQuery(
    `MATCH ()-[r:SIMILAR_TO]->()
     WITH r.score AS score ORDER BY score
     WITH collect(score) AS scores, count(score) AS total
     RETURN
       "P0-P25" AS percentile, scores[0] AS minScore, scores[toInteger(total * 0.25)] AS maxScore
     UNION ALL
     RETURN
       "P25-P50" AS percentile, scores[toInteger(total * 0.25) + 1] AS minScore, scores[toInteger(total * 0.5)] AS maxScore
     UNION ALL
     RETURN
       "P50-P75" AS percentile, scores[toInteger(total * 0.5) + 1] AS minScore, scores[toInteger(total * 0.75)] AS maxScore
     UNION ALL
     RETURN
       "P75-P100" AS percentile, scores[toInteger(total * 0.75) + 1] AS minScore, scores[toInteger(total - 1)] AS maxScore`
  );
  return result.records.map((r) => ({
    percentile: r.get("percentile") as string,
    minScore: (r.get("minScore") as number).toNumber?.(2) ?? (r.get("minScore") as number),
    maxScore: (r.get("maxScore") as number).toNumber?.(2) ?? (r.get("maxScore") as number),
  }));
}

// ── Full Submission Path Trace (variable-length path) ─────────────────────
export interface SubmissionPath {
  student: { id: number; name: string };
  submission: { id: number; title: string; score: number };
  similarTo: Array<{ title: string; score: number }>;
}

export async function getSubmissionPath(
  submissionId: number
): Promise<SubmissionPath | null> {
  const result = await runQuery(
    `MATCH (s:Student)-[sub:SUBMITTED]->(submission:Submission {submissionId: $submissionId})
     OPTIONAL MATCH (submission)-[r:SIMILAR_TO]-(other:Submission)
     RETURN s.studentId AS studentId, s.name AS studentName,
            submission.submissionId AS id, submission.title AS title,
            sub.score AS score,
            collect(DISTINCT {title: other.title, score: r.score}) AS similarTo`,
    { submissionId }
  );

  if (result.records.length === 0) return null;
  const r = result.records[0];
  return {
    student: {
      id: r.get("studentId") as number,
      name: r.get("studentName") as string,
    },
    submission: {
      id: r.get("id") as number,
      title: r.get("title") as string,
      score: r.get("score") as number,
    },
    similarTo: (r.get("similarTo") as Array<{ title: string; score: number }>).filter(
      (x) => x.title != null
    ),
  };
}
