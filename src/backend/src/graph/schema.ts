import { runQuery } from "./neo4j.client.js";
import { logger } from "../utils/logger.js";

// ── Complete Graph Schema Design ──────────────────────────────────────────
// Entity: Node label → Properties                          → Uniqueness
// ───────┼────────────────────────────────────────────────┼──────────────
// User   │ userId, name, email, role, createdAt            │ userId
// Student│ studentId, name, email, joinDate                │ studentId
// Course │ code, name, credits, createdAt, updatedAt       │ code
// Assgnmt│ assignmentId, title, dueDate, createdAt         │ assignmentId
// Submiss│ submissionId, title, status, createdAt          │ submissionId
// Section│ submissionId, sectionIndex, content, wordCount  │ (submissionId, sectionIndex) [composite]
//
// Relationship:   (:A)─[:TYPE {props}]→(:B)
// ─────────────────────────────────────────────────────────────
// (:User)─[:SUBMITTED {score, date}]→(:Submission)
// (:Student)─[:ENROLLED_IN {semester}]→(:Course)
// (:Submission)─[:HAS_SECTION]→(:Section)
// (:Submission)─[:SIMILAR_TO {score, method, detectedAt}]→(:Submission)
// (:Course)─[:HAS_ASSIGNMENT]→(:Assignment)
// (:Submission)─[:FOR_ASSIGNMENT]→(:Assignment)

const CONSTRAINTS = [
  // Entity uniqueness constraints
  {
    name: "submission_submissionId_unique",
    cypher: `CREATE CONSTRAINT submission_submissionId_unique IF NOT EXISTS
             FOR (s:Submission) REQUIRE s.submissionId IS UNIQUE`,
  },
  {
    name: "course_code_unique",
    cypher: `CREATE CONSTRAINT course_code_unique IF NOT EXISTS
             FOR (c:Course) REQUIRE c.code IS UNIQUE`,
  },
  {
    name: "section_key_unique",
    cypher: `CREATE CONSTRAINT section_key_unique IF NOT EXISTS
             FOR (sec:Section) REQUIRE (sec.submissionId, sec.sectionIndex) IS NODE KEY`,
  },
  {
    name: "user_userId_unique",
    cypher: `CREATE CONSTRAINT user_userId_unique IF NOT EXISTS
             FOR (u:User) REQUIRE u.userId IS UNIQUE`,
  },
  {
    name: "student_studentId_unique",
    cypher: `CREATE CONSTRAINT student_studentId_unique IF NOT EXISTS
             FOR (s:Student) REQUIRE s.studentId IS UNIQUE`,
  },
  {
    name: "assignment_assignmentId_unique",
    cypher: `CREATE CONSTRAINT assignment_assignmentId_unique IF NOT EXISTS
             FOR (a:Assignment) REQUIRE a.assignmentId IS UNIQUE`,
  },
];

const INDEXES = [
  // Entity property indexes
  {
    name: "submission_title_index",
    cypher: `CREATE INDEX submission_title_index IF NOT EXISTS
             FOR (s:Submission) ON (s.title)`,
  },
  {
    name: "submission_status_index",
    cypher: `CREATE INDEX submission_status_index IF NOT EXISTS
             FOR (s:Submission) ON (s.status)`,
  },
  {
    name: "user_email_index",
    cypher: `CREATE INDEX user_email_index IF NOT EXISTS
             FOR (u:User) ON (u.email)`,
  },
  {
    name: "user_role_index",
    cypher: `CREATE INDEX user_role_index IF NOT EXISTS
             FOR (u:User) ON (u.role)`,
  },
  {
    name: "student_name_index",
    cypher: `CREATE INDEX student_name_index IF NOT EXISTS
             FOR (s:Student) ON (s.name)`,
  },
  {
    name: "course_name_index",
    cypher: `CREATE INDEX course_name_index IF NOT EXISTS
             FOR (c:Course) ON (c.name)`,
  },
  // Relationship property indexes
  {
    name: "similarity_score_index",
    cypher: `CREATE INDEX similarity_score_index IF NOT EXISTS
             FOR ()-[r:SIMILAR_TO]-() ON (r.score)`,
  },
  {
    name: "submitted_score_index",
    cypher: `CREATE INDEX submitted_score_index IF NOT EXISTS
             FOR ()-[r:SUBMITTED]-() ON (r.score)`,
  },
];

// ── Initialization ────────────────────────────────────────────────────────
export async function initializeGraphSchema(): Promise<void> {
  for (const constraint of CONSTRAINTS) {
    try {
      await runQuery(constraint.cypher);
      logger.info({ constraint: constraint.name }, "Constraint ensured");
    } catch (err) {
      logger.error({ constraint: constraint.name, err }, "Failed to create constraint");
      throw err;
    }
  }

  for (const index of INDEXES) {
    try {
      await runQuery(index.cypher);
      logger.info({ index: index.name }, "Index ensured");
    } catch (err) {
      logger.error({ index: index.name, err }, "Failed to create index");
      throw err;
    }
  }

  logger.info("Graph schema initialized");
}

export async function getGraphSchema(): Promise<{
  constraints: string[];
  indexes: string[];
}> {
  const constraints = await runQuery("SHOW CONSTRAINTS");
  const indexes = await runQuery("SHOW INDEXES");
  return {
    constraints: constraints.records.map((r) => r.get("name") as string),
    indexes: indexes.records.map((r) => r.get("name") as string),
  };
}
