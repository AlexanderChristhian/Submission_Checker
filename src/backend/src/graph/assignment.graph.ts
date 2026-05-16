import { runQuery } from "./neo4j.client.js";

export interface AssignmentNode {
  assignmentId: number;
  title: string;
  courseCode: string;
  dueDate?: string;
}

export const assignmentGraph = {
  // ── Create ────────────────────────────────────────────────
  async createNode(
    assignmentId: number,
    title: string,
    courseCode: string,
    dueDate?: string
  ) {
    await runQuery(
      `MERGE (a:Assignment {assignmentId: $assignmentId})
       SET a.title = $title,
           a.dueDate = $dueDate,
           a.createdAt = datetime()
       WITH a
       MATCH (c:Course {code: $courseCode})
       MERGE (c)-[:HAS_ASSIGNMENT]->(a)`,
      { assignmentId, title, courseCode, dueDate: dueDate ?? null }
    );
  },

  // ── Read ──────────────────────────────────────────────────
  async getById(assignmentId: number): Promise<AssignmentNode | null> {
    const result = await runQuery(
      `MATCH (a:Assignment {assignmentId: $assignmentId})
       OPTIONAL MATCH (c:Course)-[:HAS_ASSIGNMENT]->(a)
       RETURN a.assignmentId, a.title, a.dueDate, c.code AS courseCode`,
      { assignmentId }
    );
    if (result.records.length === 0) return null;
    const r = result.records[0];
    return {
      assignmentId: r.get("a.assignmentId") as number,
      title: r.get("a.title") as string,
      courseCode: r.get("courseCode") as string,
      dueDate: r.get("a.dueDate") as string | undefined,
    };
  },

  async getByCourse(courseCode: string): Promise<AssignmentNode[]> {
    const result = await runQuery(
      `MATCH (c:Course {code: $courseCode})-[:HAS_ASSIGNMENT]->(a:Assignment)
       RETURN a.assignmentId, a.title, a.dueDate, c.code AS courseCode
       ORDER BY a.dueDate ASC`,
      { courseCode }
    );
    return result.records.map((r) => ({
      assignmentId: r.get("a.assignmentId") as number,
      title: r.get("a.title") as string,
      courseCode: r.get("courseCode") as string,
      dueDate: r.get("a.dueDate") as string | undefined,
    }));
  },

  async getAll(): Promise<AssignmentNode[]> {
    const result = await runQuery(
      `MATCH (c:Course)-[:HAS_ASSIGNMENT]->(a:Assignment)
       RETURN a.assignmentId, a.title, a.dueDate, c.code AS courseCode
       ORDER BY a.dueDate DESC`
    );
    return result.records.map((r) => ({
      assignmentId: r.get("a.assignmentId") as number,
      title: r.get("a.title") as string,
      courseCode: r.get("courseCode") as string,
      dueDate: r.get("a.dueDate") as string | undefined,
    }));
  },

  // ── Update ────────────────────────────────────────────────
  async updateNode(
    assignmentId: number,
    data: Partial<{ title: string; dueDate: string }>
  ) {
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { assignmentId };

    if (data.title !== undefined) {
      setClauses.push("a.title = $title");
      params["title"] = data.title;
    }
    if (data.dueDate !== undefined) {
      setClauses.push("a.dueDate = $dueDate");
      params["dueDate"] = data.dueDate;
    }
    setClauses.push("a.updatedAt = datetime()");

    await runQuery(
      `MATCH (a:Assignment {assignmentId: $assignmentId})
       SET ${setClauses.join(", ")}`,
      params
    );
  },

  // ── Delete ────────────────────────────────────────────────
  async deleteNode(assignmentId: number) {
    await runQuery(
      `MATCH (a:Assignment {assignmentId: $assignmentId})
       DETACH DELETE a`,
      { assignmentId }
    );
  },

  // ── Submission linking ────────────────────────────────────
  async linkSubmission(assignmentId: number, submissionId: number) {
    await runQuery(
      `MATCH (a:Assignment {assignmentId: $assignmentId})
       MATCH (s:Submission {submissionId: $submissionId})
       MERGE (s)-[:FOR_ASSIGNMENT]->(a)`,
      { assignmentId, submissionId }
    );
  },

  async getSubmissions(assignmentId: number) {
    const result = await runQuery(
      `MATCH (s:Submission)-[:FOR_ASSIGNMENT]->(a:Assignment {assignmentId: $assignmentId})
       RETURN s.submissionId, s.title, s.status, s.createdAt
       ORDER BY s.createdAt DESC`,
      { assignmentId }
    );
    return result.records.map((r) => ({
      submissionId: r.get("s.submissionId") as number,
      title: r.get("s.title") as string,
      status: r.get("s.status") as string,
      createdAt: r.get("s.createdAt") as string,
    }));
  },
};
