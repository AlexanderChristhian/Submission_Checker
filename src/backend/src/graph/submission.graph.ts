import { runQuery } from "./neo4j.client.js";

export interface SubmissionNode {
  submissionId: number;
  title: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const submissionGraph = {
  // ── Create ────────────────────────────────────────────────
  async createNode(submissionId: number, title: string, status?: string) {
    await runQuery(
      `MERGE (s:Submission {submissionId: $submissionId})
       SET s.title = $title,
           s.status = $status,
           s.createdAt = datetime()`,
      { submissionId, title, status: status ?? "PENDING" }
    );
  },

  // ── Read ──────────────────────────────────────────────────
  async getById(submissionId: number): Promise<SubmissionNode | null> {
    const result = await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})
       RETURN s.submissionId, s.title, s.status, s.createdAt, s.updatedAt`,
      { submissionId }
    );
    if (result.records.length === 0) return null;
    const r = result.records[0]!;
    const status = r.get("s.status") as string | null;
    const createdAt = r.get("s.createdAt") as string | null;
    const updatedAt = r.get("s.updatedAt") as string | null;
    return {
      submissionId: r.get("s.submissionId") as number,
      title: r.get("s.title") as string,
      ...(status !== null && { status }),
      ...(createdAt !== null && { createdAt }),
      ...(updatedAt !== null && { updatedAt }),
    };
  },

  async getAll(): Promise<SubmissionNode[]> {
    const result = await runQuery(
      `MATCH (s:Submission)
       RETURN s.submissionId, s.title, s.status, s.createdAt, s.updatedAt
       ORDER BY s.createdAt DESC`
    );
    return result.records.map((r) => {
      const status = r.get("s.status") as string | null;
      const createdAt = r.get("s.createdAt") as string | null;
      const updatedAt = r.get("s.updatedAt") as string | null;
      return {
        submissionId: r.get("s.submissionId") as number,
        title: r.get("s.title") as string,
        ...(status !== null && { status }),
        ...(createdAt !== null && { createdAt }),
        ...(updatedAt !== null && { updatedAt }),
      };
    });
  },

  async findByStatus(status: string): Promise<SubmissionNode[]> {
    const result = await runQuery(
      `MATCH (s:Submission)
       WHERE s.status = $status
       RETURN s.submissionId, s.title, s.status, s.createdAt
       ORDER BY s.createdAt DESC`,
      { status }
    );
    return result.records.map((r) => {
      const sStatus = r.get("s.status") as string | null;
      const createdAt = r.get("s.createdAt") as string | null;
      return {
        submissionId: r.get("s.submissionId") as number,
        title: r.get("s.title") as string,
        ...(sStatus !== null && { status: sStatus }),
        ...(createdAt !== null && { createdAt }),
      };
    });
  },

  // ── Update ────────────────────────────────────────────────
  async updateNode(
    submissionId: number,
    data: Partial<{ title: string; status: string }>
  ) {
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { submissionId };

    if (data.title !== undefined) {
      setClauses.push("s.title = $title");
      params["title"] = data.title;
    }
    if (data.status !== undefined) {
      setClauses.push("s.status = $status");
      params["status"] = data.status;
    }
    setClauses.push("s.updatedAt = datetime()");

    await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})
       SET ${setClauses.join(", ")}`,
      params
    );
  },

  // ── Delete ────────────────────────────────────────────────
  async deleteNode(submissionId: number) {
    await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})
       DETACH DELETE s`,
      { submissionId }
    );
  },

  // ── Section management (nested CRUD) ──────────────────────
  async createSectionNode(
    submissionId: number,
    sectionIndex: number,
    content: string,
    wordCount?: number
  ) {
    await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})
       MERGE (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       SET sec.content = $content,
           sec.wordCount = $wordCount
       MERGE (s)-[:HAS_SECTION]->(sec)`,
      { submissionId, sectionIndex, content, wordCount: wordCount ?? 0 }
    );
  },

  async updateSectionNode(
    submissionId: number,
    sectionIndex: number,
    data: Partial<{ content: string; wordCount: number }>
  ) {
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { submissionId, sectionIndex };

    if (data.content !== undefined) {
      setClauses.push("sec.content = $content");
      params["content"] = data.content;
    }
    if (data.wordCount !== undefined) {
      setClauses.push("sec.wordCount = $wordCount");
      params["wordCount"] = data.wordCount;
    }

    await runQuery(
      `MATCH (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       SET ${setClauses.join(", ")}`,
      params
    );
  },

  async deleteSectionNode(submissionId: number, sectionIndex: number) {
    await runQuery(
      `MATCH (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       DETACH DELETE sec`,
      { submissionId, sectionIndex }
    );
  },

  async getSections(submissionId: number) {
    const result = await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})-[:HAS_SECTION]->(sec:Section)
       RETURN sec.sectionIndex, sec.content, sec.wordCount
       ORDER BY sec.sectionIndex`,
      { submissionId }
    );
    return result.records.map((r) => ({
      sectionIndex: r.get("sec.sectionIndex") as number,
      content: r.get("sec.content") as string,
      wordCount: r.get("sec.wordCount") as number,
    }));
  },

  async deleteAllSections(submissionId: number) {
    await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})-[:HAS_SECTION]->(sec:Section)
       DETACH DELETE sec`,
      { submissionId }
    );
  },
};
