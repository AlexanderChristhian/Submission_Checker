import { runQuery } from "./neo4j.client.js";
export const submissionGraph = {
    // ── Create ────────────────────────────────────────────────
    async createNode(submissionId, title, status) {
        await runQuery(`MERGE (s:Submission {submissionId: $submissionId})
       SET s.title = $title,
           s.status = $status,
           s.createdAt = datetime()`, { submissionId, title, status: status ?? "PENDING" });
    },
    // ── Read ──────────────────────────────────────────────────
    async getById(submissionId) {
        const result = await runQuery(`MATCH (s:Submission {submissionId: $submissionId})
       RETURN s.submissionId, s.title, s.status, s.createdAt, s.updatedAt`, { submissionId });
        if (result.records.length === 0)
            return null;
        const r = result.records[0];
        const status = r.get("s.status");
        const createdAt = r.get("s.createdAt");
        const updatedAt = r.get("s.updatedAt");
        return {
            submissionId: r.get("s.submissionId"),
            title: r.get("s.title"),
            ...(status !== null && { status }),
            ...(createdAt !== null && { createdAt }),
            ...(updatedAt !== null && { updatedAt }),
        };
    },
    async getAll() {
        const result = await runQuery(`MATCH (s:Submission)
       RETURN s.submissionId, s.title, s.status, s.createdAt, s.updatedAt
       ORDER BY s.createdAt DESC`);
        return result.records.map((r) => {
            const status = r.get("s.status");
            const createdAt = r.get("s.createdAt");
            const updatedAt = r.get("s.updatedAt");
            return {
                submissionId: r.get("s.submissionId"),
                title: r.get("s.title"),
                ...(status !== null && { status }),
                ...(createdAt !== null && { createdAt }),
                ...(updatedAt !== null && { updatedAt }),
            };
        });
    },
    async findByStatus(status) {
        const result = await runQuery(`MATCH (s:Submission)
       WHERE s.status = $status
       RETURN s.submissionId, s.title, s.status, s.createdAt
       ORDER BY s.createdAt DESC`, { status });
        return result.records.map((r) => {
            const sStatus = r.get("s.status");
            const createdAt = r.get("s.createdAt");
            return {
                submissionId: r.get("s.submissionId"),
                title: r.get("s.title"),
                ...(sStatus !== null && { status: sStatus }),
                ...(createdAt !== null && { createdAt }),
            };
        });
    },
    // ── Update ────────────────────────────────────────────────
    async updateNode(submissionId, data) {
        const setClauses = [];
        const params = { submissionId };
        if (data.title !== undefined) {
            setClauses.push("s.title = $title");
            params["title"] = data.title;
        }
        if (data.status !== undefined) {
            setClauses.push("s.status = $status");
            params["status"] = data.status;
        }
        setClauses.push("s.updatedAt = datetime()");
        await runQuery(`MATCH (s:Submission {submissionId: $submissionId})
       SET ${setClauses.join(", ")}`, params);
    },
    // ── Delete ────────────────────────────────────────────────
    async deleteNode(submissionId) {
        await runQuery(`MATCH (s:Submission {submissionId: $submissionId})
       DETACH DELETE s`, { submissionId });
    },
    // ── Section management (nested CRUD) ──────────────────────
    async createSectionNode(submissionId, sectionIndex, content, wordCount) {
        await runQuery(`MATCH (s:Submission {submissionId: $submissionId})
       MERGE (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       SET sec.content = $content,
           sec.wordCount = $wordCount
       MERGE (s)-[:HAS_SECTION]->(sec)`, { submissionId, sectionIndex, content, wordCount: wordCount ?? 0 });
    },
    async updateSectionNode(submissionId, sectionIndex, data) {
        const setClauses = [];
        const params = { submissionId, sectionIndex };
        if (data.content !== undefined) {
            setClauses.push("sec.content = $content");
            params["content"] = data.content;
        }
        if (data.wordCount !== undefined) {
            setClauses.push("sec.wordCount = $wordCount");
            params["wordCount"] = data.wordCount;
        }
        await runQuery(`MATCH (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       SET ${setClauses.join(", ")}`, params);
    },
    async deleteSectionNode(submissionId, sectionIndex) {
        await runQuery(`MATCH (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       DETACH DELETE sec`, { submissionId, sectionIndex });
    },
    async getSections(submissionId) {
        const result = await runQuery(`MATCH (s:Submission {submissionId: $submissionId})-[:HAS_SECTION]->(sec:Section)
       RETURN sec.sectionIndex, sec.content, sec.wordCount
       ORDER BY sec.sectionIndex`, { submissionId });
        return result.records.map((r) => ({
            sectionIndex: r.get("sec.sectionIndex"),
            content: r.get("sec.content"),
            wordCount: r.get("sec.wordCount"),
        }));
    },
    async deleteAllSections(submissionId) {
        await runQuery(`MATCH (s:Submission {submissionId: $submissionId})-[:HAS_SECTION]->(sec:Section)
       DETACH DELETE sec`, { submissionId });
    },
};
//# sourceMappingURL=submission.graph.js.map