import { getNeo4jDriver, closeNeo4j } from "../config/neo4j.js";
import { initializeGraphSchema } from "../graph/schema.js";
import { submissionGraph } from "../graph/submission.graph.js";
import { similarityGraph } from "../graph/similarity.graph.js";
import { courseGraph } from "../graph/course.graph.js";
import { userGraph } from "../graph/user.graph.js";
import { assignmentGraph } from "../graph/assignment.graph.js";

// ── Setup: seed a fresh graph before exercises ─────────────────────────────
async function seedTestData() {
  const driver = getNeo4jDriver();
  await driver.verifyConnectivity();
  console.log("Connected to Neo4j\n");

  await initializeGraphSchema();

  const session = driver.session();
  try {
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("Cleared existing graph data\n");

    // ── 1. Users & Students ──────────────────────────────────
    const users = [
      { userId: "1", name: "Alice", email: "alice@uni.edu", role: "STUDENT" },
      { userId: "2", name: "Bob", email: "bob@uni.edu", role: "STUDENT" },
      { userId: "3", name: "Charlie", email: "charlie@uni.edu", role: "STUDENT" },
      { userId: "4", name: "Diana", email: "diana@uni.edu", role: "STUDENT" },
      { userId: "5", name: "Eve", email: "eve@uni.edu", role: "STUDENT" },
      { userId: "6", name: "Dr. Smith", email: "smith@uni.edu", role: "LECTURER" },
    ];
    for (const u of users) {
      await userGraph.createNode(u.userId, u.name, u.email, u.role);
    }
    console.log(`  Seeded ${users.length} users`);

    const students = [
      { studentId: 1, name: "Alice", email: "alice@uni.edu" },
      { studentId: 2, name: "Bob", email: "bob@uni.edu" },
      { studentId: 3, name: "Charlie", email: "charlie@uni.edu" },
      { studentId: 4, name: "Diana", email: "diana@uni.edu" },
      { studentId: 5, name: "Eve", email: "eve@uni.edu" },
    ];
    for (const s of students) {
      await session.run(
        `MERGE (s:Student {studentId: $studentId})
         SET s.name = $name, s.email = $email, s.joinDate = date("2025-09-01")`,
        s
      );
    }
    console.log(`  Seeded ${students.length} students`);

    // Link User → Student
    for (let i = 0; i < 5; i++) {
      await session.run(
        `MATCH (u:User {userId: $userId}), (s:Student {studentId: $studentId})
         MERGE (u)-[:IS_STUDENT]->(s)`,
        { userId: users[i]!.userId, studentId: students[i]!.studentId }
      );
    }

    // ── 2. Courses ───────────────────────────────────────────
    const courses = [
      { code: "CS101", name: "Data Structures", credits: 3 },
      { code: "CS201", name: "Algorithms", credits: 4 },
      { code: "CS301", name: "Machine Learning", credits: 3 },
      { code: "EE101", name: "Digital Logic", credits: 3 },
    ];
    for (const course of courses) {
      await courseGraph.createOrUpdate(course);
    }
    console.log(`  Seeded ${courses.length} courses`);

    // ── 3. Assignments ───────────────────────────────────────
    const assignments = [
      { assignmentId: 1, title: "Sorting Algorithms Implementation", courseCode: "CS101", dueDate: "2026-05-20" },
      { assignmentId: 2, title: "Binary Search Tree Report", courseCode: "CS101", dueDate: "2026-06-01" },
      { assignmentId: 3, title: "Graph Traversal Essay", courseCode: "CS201", dueDate: "2026-06-05" },
      { assignmentId: 4, title: "Dynamic Programming Problem Set", courseCode: "CS201", dueDate: "2026-06-15" },
      { assignmentId: 5, title: "Neural Network Overview", courseCode: "CS301", dueDate: "2026-06-20" },
    ];
    for (const a of assignments) {
      await assignmentGraph.createNode(a.assignmentId, a.title, a.courseCode, a.dueDate);
    }
    console.log(`  Seeded ${assignments.length} assignments`);

    // ── 4. Submissions ───────────────────────────────────────
    const submissions = [
      { submissionId: 101, title: "Quick Sort Analysis", status: "CHECKED", assignmentId: 1 },
      { submissionId: 102, title: "Merge Sort Performance", status: "CHECKED", assignmentId: 1 },
      { submissionId: 103, title: "BST Node Insertion", status: "CHECKED", assignmentId: 2 },
      { submissionId: 104, title: "Depth First Search Walkthrough", status: "CHECKED", assignmentId: 3 },
      { submissionId: 105, title: "BFS vs DFS Comparison", status: "CHECKED", assignmentId: 3 },
      { submissionId: 106, title: "Knapsack Problem Solution", status: "PENDING", assignmentId: 4 },
      { submissionId: 107, title: "Perceptron Implementation", status: "PENDING", assignmentId: 5 },
      { submissionId: 108, title: "CNN Layer Design", status: "CHECKED", assignmentId: 5 },
    ];
    for (const sub of submissions) {
      await submissionGraph.createNode(sub.submissionId, sub.title, sub.status);
      await assignmentGraph.linkSubmission(sub.assignmentId, sub.submissionId);
    }
    console.log(`  Seeded ${submissions.length} submissions`);

    // ── 5. Sections ──────────────────────────────────────────
    const sections = [
      { submissionId: 101, sectionIndex: 1, content: "Quick sort algorithm overview", wordCount: 300 },
      { submissionId: 101, sectionIndex: 2, content: "Partitioning scheme comparison", wordCount: 500 },
      { submissionId: 102, sectionIndex: 1, content: "Merge sort divide-and-conquer strategy", wordCount: 400 },
      { submissionId: 103, sectionIndex: 1, content: "Binary search tree implementation", wordCount: 350 },
      { submissionId: 104, sectionIndex: 1, content: "DFS recursive implementation", wordCount: 250 },
      { submissionId: 104, sectionIndex: 2, content: "DFS iterative using stack", wordCount: 300 },
      { submissionId: 105, sectionIndex: 1, content: "Comparing BFS and DFS traversal", wordCount: 450 },
      { submissionId: 108, sectionIndex: 1, content: "Convolutional neural network layers", wordCount: 600 },
    ];
    for (const sec of sections) {
      await submissionGraph.createSectionNode(
        sec.submissionId, sec.sectionIndex, sec.content, sec.wordCount
      );
    }
    console.log(`  Seeded ${sections.length} sections`);

    // ── 6. Enrollments ───────────────────────────────────────
    const enrollments: [string, number, string][] = [
      ["CS101", 1, "Alice"], ["CS101", 2, "Bob"], ["CS101", 3, "Charlie"],
      ["CS201", 1, "Alice"], ["CS201", 4, "Diana"],
      ["CS301", 3, "Charlie"], ["CS301", 5, "Eve"],
      ["EE101", 2, "Bob"], ["EE101", 4, "Diana"],
    ];
    for (const [code, sid, name] of enrollments) {
      await courseGraph.enrollStudent(code, sid, name, "2026S1");
    }
    console.log(`  Seeded ${enrollments.length} enrollments`);

    // ── 7. Submission → User links ───────────────────────────
    const submissionOwners: [string, number, number][] = [
      ["1", 101, 85], ["2", 102, 92], ["3", 103, 78],
      ["1", 104, 95], ["4", 105, 88], ["3", 106, 80],
      ["5", 107, 91], ["5", 108, 87],
    ];
    for (const [userId, submissionId] of submissionOwners) {
      await userGraph.linkToSubmission(userId, submissionId);
    }
    console.log(`  Seeded ${submissionOwners.length} submission links`);

    // ── 8. Similarity edges ──────────────────────────────────
    const similarityEdges: [number, number, number][] = [
      [101, 102, 0.88],   // Both sorting (same assignment: CS101-1)
      [101, 105, 0.65],   // Sorting vs graph traversal (cross-course)
      [102, 108, 0.42],
      [104, 105, 0.91],   // Both graph traversal (same assignment: CS201-3)
      [104, 103, 0.55],
      [106, 107, 0.35],
      [103, 101, 0.72],   // Sorting vs BST (same course)
      [107, 108, 0.78],   // Both ML (same assignment: CS301-5)
    ];
    for (const [idA, idB, score] of similarityEdges) {
      await similarityGraph.createSimilarEdge(idA, idB, score);
    }
    console.log(`  Seeded ${similarityEdges.length} similarity edges`);

    // ── Verify ───────────────────────────────────────────────
    const verifyResult = await session.run(`
      MATCH (n)
      RETURN labels(n) AS labels, count(n) AS count
      ORDER BY labels(n)[0]
    `);
    console.log("\nSeed complete — node counts:");
    for (const record of verifyResult.records) {
      console.log(`  ${(record.get("labels") as string[]).join(", ")}: ${record.get("count")}`);
    }
  } finally {
    await session.close();
  }
}

// ── Exercise 1: EXISTS Subquery ─────────────────────────────────────────────
// Find all students who have submitted to CS101 (recursive path:
// Student → ENROLLED_IN → Course ← HAS_ASSIGNMENT ← Assignment ← FOR_ASSIGNMENT ← Submission)
async function exercise1() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("\n═══ Exercise 1: EXISTS Subquery ═══");
    console.log("Students with submissions in Data Structures (CS101):\n");

    const result = await session.run(`
      MATCH (s:Student)
      WHERE EXISTS {
        MATCH (s)-[:ENROLLED_IN]->(c:Course {code: "CS101"})
          <-[:HAS_ASSIGNMENT]-(:Assignment)<-[:FOR_ASSIGNMENT]-(:Submission)
      }
      RETURN s.name AS student, s.studentId AS id
      ORDER BY student
    `);

    for (const record of result.records) {
      console.log(`  - ${record.get("student")} (ID: ${record.get("id")})`);
    }
    console.log(`\n  → ${result.records.length} students found\n`);
  } finally {
    await session.close();
  }
}

// ── Exercise 2: Subquery with COUNT ─────────────────────────────────────────
// Count submissions per student across all courses
async function exercise2() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("═══ Exercise 2: COUNT Subquery ═══");
    console.log("Submission count per student:\n");

    const result = await session.run(`
      MATCH (s:Student)
      RETURN s.name AS student,
             COUNT {
               MATCH (s)-[:ENROLLED_IN]->(:Course)
                 <-[:HAS_ASSIGNMENT]-(:Assignment)<-[:FOR_ASSIGNMENT]-(sub:Submission)
             } AS totalSubmissions
      ORDER BY totalSubmissions DESC, student ASC
    `);

    for (const record of result.records) {
      console.log(`  ${record.get("student")}: ${record.get("totalSubmissions")} submissions`);
    }
  } finally {
    await session.close();
  }
}

// ── Exercise 3: CALL { ... } UNION Subquery ─────────────────────────────────
// Find all entities (users or courses) related to a keyword match
async function exercise3() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("\n═══ Exercise 3: CALL { ... } UNION Subquery ═══");
    console.log("All entities matching 'Sort':\n");

    const result = await session.run(`
      CALL {
        MATCH (s:Submission)
        WHERE s.title CONTAINS "Sort"
        RETURN s.title AS name, "Submission" AS type, s.submissionId AS id
        UNION
        MATCH (c:Course)
        WHERE c.name CONTAINS "Sort"
        RETURN c.name AS name, "Course" AS type, c.code AS id
        UNION
        MATCH (a:Assignment)
        WHERE a.title CONTAINS "Sort"
        RETURN a.title AS name, "Assignment" AS type, a.assignmentId AS id
      }
      RETURN name, type, id
      ORDER BY type, name
    `);

    for (const record of result.records) {
      console.log(`  [${record.get("type")}] ${record.get("name")} (ID: ${record.get("id")})`);
    }
    console.log(`\n  → ${result.records.length} results`);
  } finally {
    await session.close();
  }
}

// ── Exercise 4: COLLECT { ... } with ORDER BY + LIMIT ───────────────────────
// Top 2 submissions per assignment (by submissionId)
async function exercise4() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("\n═══ Exercise 4: COLLECT Subquery with ORDER BY + LIMIT ═══");
    console.log("Top 2 submissions per assignment:\n");

    const result = await session.run(`
      MATCH (a:Assignment)
      RETURN a.title AS assignment,
             COLLECT {
               MATCH (a)<-[:FOR_ASSIGNMENT]-(s:Submission)
               RETURN s.title AS submission, s.submissionId AS id
               ORDER BY s.submissionId ASC
               LIMIT 2
             } AS topSubs
      ORDER BY assignment
    `);

    for (const record of result.records) {
      const topSubs = record.get("topSubs") as Array<{ submission: string; id: number }>;
      console.log(`  ${record.get("assignment")}:`);
      for (const sub of topSubs) {
        console.log(`    - ${sub.submission} (ID: ${sub.id})`);
      }
    }
  } finally {
    await session.close();
  }
}

// ── Exercise 5: Subquery with Aggregation ───────────────────────────────────
// Average similarity score per assignment group
async function exercise5() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("\n═══ Exercise 5: Nested Subquery with Aggregation ═══");
    console.log("Average similarity score per assignment:\n");

    const result = await session.run(`
      MATCH (a:Assignment)
      RETURN a.title AS assignment,
             a.assignmentId AS id,
             COUNT {
               MATCH (a)<-[:FOR_ASSIGNMENT]-(sub:Submission)-[r:SIMILAR_TO]->(:Submission)
               RETURN r
             } AS similarityEdges,
             ROUND(AVG {
               MATCH (a)<-[:FOR_ASSIGNMENT]-(sub:Submission)-[r:SIMILAR_TO]->(:Submission)
               RETURN r.score
             } * 100) / 100.0 AS avgSimilarity
      ORDER BY avgSimilarity DESC
    `);

    for (const record of result.records) {
      const avg = record.get("avgSimilarity");
      console.log(`  ${record.get("assignment")} (${record.get("id")}):`);
      console.log(`    Edges: ${record.get("similarityEdges")}, Avg Score: ${avg !== null ? avg : "N/A"}`);
    }
  } finally {
    await session.close();
  }
}

// ── Exercise 6: Combined EXISTS + Aggregation ──────────────────────────────
// Finder flagged students with high similarity to others
async function exercise6() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("\n═══ Exercise 6: EXISTS + Aggregation ═══");
    console.log("Students with at least one high-similarity submission (>0.85):\n");

    const result = await session.run(`
      MATCH (s:Student)
      WHERE EXISTS {
        MATCH (s)-[:ENROLLED_IN]->(:Course)
          <-[:HAS_ASSIGNMENT]-(:Assignment)<-[:FOR_ASSIGNMENT]-(sub:Submission)
          WHERE EXISTS {
            MATCH (sub)-[r:SIMILAR_TO]->(:Submission)
            WHERE r.score >= 0.85
          }
      }
      RETURN s.name AS student,
             COUNT {
               MATCH (s)-[:ENROLLED_IN]->(:Course)
                 <-[:HAS_ASSIGNMENT]-(:Assignment)<-[:FOR_ASSIGNMENT]-(sub:Submission)
                 WHERE EXISTS {
                   MATCH (sub)-[r:SIMILAR_TO]->(:Submission)
                   WHERE r.score >= 0.85
                 }
             } AS flaggedSubmissions
      ORDER BY flaggedSubmissions DESC, student
    `);

    for (const record of result.records) {
      console.log(`  ${record.get("student")}: ${record.get("flaggedSubmissions")} flagged submissions`);
    }
  } finally {
    await session.close();
  }
}

// ── Exercise 7: Schema introspection with SHOW CONSTRAINTS/INDEXES ──────────
async function exercise7() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("\n═══ Exercise 7: Schema Introspection ═══\n");

    const constraintsResult = await session.run("SHOW CONSTRAINTS");
    console.log("Constraints:");
    for (const record of constraintsResult.records) {
      console.log(`  - ${record.get("name")} (type: ${record.get("type")})`);
    }

    const indexesResult = await session.run("SHOW INDEXES");
    console.log("\nIndexes:");
    for (const record of indexesResult.records) {
      console.log(`  - ${record.get("name")} (type: ${record.get("type")})`);
    }
  } finally {
    await session.close();
  }
}

// ── Exercise 8: APOC-style procedures (pure Cypher equivalents) ───────────
// Levenshtein-style title similarity using CONTAINS and manual distance
async function exercise8() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log("\n═══ Exercise 8: Cross-Submission Title Matching ═══");
    console.log("Submission pairs with overlapping title terms:\n");

    const result = await session.run(`
      MATCH (a:Submission), (b:Submission)
      WHERE a.submissionId < b.submissionId
        AND (a.title CONTAINS "Sort" AND b.title CONTAINS "Sort"
          OR a.title CONTAINS "Search" AND b.title CONTAINS "Search"
          OR a.title CONTAINS "Tree" AND b.title CONTAINS "Tree"
          OR a.title CONTAINS "Network" AND b.title CONTAINS "Network"
          OR a.title CONTAINS "DFS" AND b.title CONTAINS "DFS"
          OR a.title CONTAINS "BFS" AND b.title CONTAINS "BFS")
      RETURN a.title AS titleA, b.title AS titleB
      ORDER BY titleA, titleB
    `);

    for (const record of result.records) {
      console.log(`  "${record.get("titleA")}" ↔ "${record.get("titleB")}"`);
    }
    console.log(`\n  → ${result.records.length} pairs found`);
  } finally {
    await session.close();
  }
}

// ── Main runner ─────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║  Advanced Cypher Queries Exercise Runner     ║");
    console.log("╚══════════════════════════════════════════════╝\n");

    await seedTestData();

    await exercise1();
    await exercise2();
    await exercise3();
    await exercise4();
    await exercise5();
    await exercise6();
    await exercise7();
    await exercise8();

    console.log("\n══════════════════════════════════════════════");
    console.log("All exercises completed successfully!");
  } catch (err) {
    console.error("Exercise runner failed:", err);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
