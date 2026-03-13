import { runQuery } from "./neo4j.client.js";
export const submissionGraph = {
    async createNode(submissionId, title) {
        await runQuery(`MERGE (s:Submission {submissionId: $submissionId})
       SET s.title = $title, s.createdAt = datetime()`, { submissionId, title });
    },
    async deleteNode(submissionId) {
        await runQuery(`MATCH (s:Submission {submissionId: $submissionId})
       DETACH DELETE s`, { submissionId });
    },
    async createSectionNode(submissionId, sectionIndex, content) {
        await runQuery(`MATCH (s:Submission {submissionId: $submissionId})
       MERGE (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       SET sec.content = $content
       MERGE (s)-[:HAS_SECTION]->(sec)`, { submissionId, sectionIndex, content });
    },
};
//# sourceMappingURL=submission.graph.js.map