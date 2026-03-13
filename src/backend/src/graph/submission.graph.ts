import { runQuery } from "./neo4j.client.js";

export const submissionGraph = {
  async createNode(submissionId: number, title: string) {
    await runQuery(
      `MERGE (s:Submission {submissionId: $submissionId})
       SET s.title = $title, s.createdAt = datetime()`,
      { submissionId, title }
    );
  },

  async deleteNode(submissionId: number) {
    await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})
       DETACH DELETE s`,
      { submissionId }
    );
  },

  async createSectionNode(
    submissionId: number,
    sectionIndex: number,
    content: string
  ) {
    await runQuery(
      `MATCH (s:Submission {submissionId: $submissionId})
       MERGE (sec:Section {submissionId: $submissionId, sectionIndex: $sectionIndex})
       SET sec.content = $content
       MERGE (s)-[:HAS_SECTION]->(sec)`,
      { submissionId, sectionIndex, content }
    );
  },
};
