import { getNeo4jDriver, closeNeo4j } from "../config/neo4j.js";
import { initializeGraphSchema } from "../graph/schema.js";
import { submissionGraph } from "../graph/submission.graph.js";
import { similarityGraph } from "../graph/similarity.graph.js";
import { courseGraph } from "../graph/course.graph.js";
import { userGraph } from "../graph/user.graph.js";
import { assignmentGraph } from "../graph/assignment.graph.js";

async function seed() {
  const driver = getNeo4jDriver();
  await driver.verifyConnectivity();
  console.log("Connected to Neo4j");

  await initializeGraphSchema();
  console.log("Schema initialized");

  const session = driver.session();

  try {
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("Cleared existing graph data\n");

    // ── 1. Users ────────────────────────────────────────────
    const users = [
      { userId: 1, name: "Alice", email: "alice@uni.edu", role: "STUDENT" },
      { userId: 2, name: "Bob", email: "bob@uni.edu", role: "STUDENT" },
      { userId: 3, name: "Charlie", email: "charlie@uni.edu", role: "STUDENT" },
      { userId: 4, name: "Diana", email: "diana@uni.edu", role: "STUDENT" },
      { userId: 5, name: "Dr. Smith", email: "smith@uni.edu", role: "LECTURER" },
    ];
    for (const u of users) {
      await userGraph.createNode(u.userId, u.name, u.email, u.role);
    }
    console.log(`  Users: ${users.length}`);

    // ── 2. Students ──────────────────────────────────────────
    const students = [
      { studentId: 1, name: "Alice", email: "alice@uni.edu" },
      { studentId: 2, name: "Bob", email: "bob@uni.edu" },
      { studentId: 3, name: "Charlie", email: "charlie@uni.edu" },
      { studentId: 4, name: "Diana", email: "diana@uni.edu" },
    ];
    for (const s of students) {
      await session.run(
        `MERGE (s:Student {studentId: $studentId})
         SET s.name = $name, s.email = $email, s.joinDate = date("2025-09-01")`,
        s
      );
    }
    console.log(`  Students: ${students.length}`);

    // Map Users → link Students
    for (let i = 0; i < users.length; i++) {
      await session.run(
        `MATCH (u:User {userId: $userId}), (s:Student {studentId: $studentId})
         MERGE (u)-[:IS_STUDENT]->(s)`,
        { userId: users[i].userId, studentId: students[i].studentId }
      );
    }
    console.log("  User→Student links created");

    // ── 3. Courses ───────────────────────────────────────────
    const courses = [
      { code: "CS101", name: "Data Structures", credits: 3 },
      { code: "CS201", name: "Algorithms", credits: 4 },
      { code: "CS301", name: "Machine Learning", credits: 3 },
    ];
    for (const course of courses) {
      await courseGraph.createOrUpdate(course);
    }
    console.log(`  Courses: ${courses.length}`);

    // ── 4. Assignments ───────────────────────────────────────
    const assignments = [
      { assignmentId: 1, title: "Sorting Algorithms Implementation", courseCode: "CS101", dueDate: "2026-05-20" },
      { assignmentId: 2, title: "Graph Data Structure Essay", courseCode: "CS101", dueDate: "2026-05-25" },
      { assignmentId: 3, title: "Algorithm Analysis Report", courseCode: "CS201", dueDate: "2026-06-01" },
    ];
    for (const a of assignments) {
      await assignmentGraph.createNode(a.assignmentId, a.title, a.courseCode, a.dueDate);
    }
    console.log(`  Assignments: ${assignments.length}`);

    // ── 5. Submissions ───────────────────────────────────────
    const submissions = [
      { submissionId: 101, title: "Quick Sort Analysis", status: "CHECKED", assignmentId: 1 },
      { submissionId: 102, title: "Graph Theory Applications", status: "CHECKED", assignmentId: 2 },
      { submissionId: 103, title: "Sorting Algorithms Comparison", status: "CHECKED", assignmentId: 1 },
      { submissionId: 104, title: "Database Design Principles", status: "PENDING", assignmentId: 2 },
      { submissionId: 105, title: "Merge Sort Deep Dive", status: "CHECKED", assignmentId: 1 },
    ];
    for (const sub of submissions) {
      await submissionGraph.createNode(sub.submissionId, sub.title, sub.status);
      // Link to assignment
      await assignmentGraph.linkSubmission(sub.assignmentId, sub.submissionId);
    }
    console.log(`  Submissions: ${submissions.length}`);

    // ── 6. Sections ──────────────────────────────────────────
    const sections = [
      { submissionId: 101, sectionIndex: 1, content: "Introduction to sorting algorithms", wordCount: 250 },
      { submissionId: 101, sectionIndex: 2, content: "Quick sort implementation details", wordCount: 500 },
      { submissionId: 101, sectionIndex: 3, content: "Complexity analysis", wordCount: 300 },
      { submissionId: 103, sectionIndex: 1, content: "Comparing sorting algorithms", wordCount: 400 },
      { submissionId: 103, sectionIndex: 2, content: "Quick sort vs merge sort benchmarks", wordCount: 600 },
    ];
    for (const sec of sections) {
      await submissionGraph.createSectionNode(
        sec.submissionId, sec.sectionIndex, sec.content, sec.wordCount
      );
    }
    console.log(`  Sections: ${sections.length}`);

    // ── 7. Enrollments ───────────────────────────────────────
    await courseGraph.enrollStudent("CS101", 1, "Alice", "2026S1");
    await courseGraph.enrollStudent("CS101", 2, "Bob", "2026S1");
    await courseGraph.enrollStudent("CS101", 3, "Charlie", "2026S1");
    await courseGraph.enrollStudent("CS201", 1, "Alice", "2026S1");
    await courseGraph.enrollStudent("CS201", 4, "Diana", "2026S1");
    console.log("  Enrollments: 5");

    // ── 8. Student→Submission links ──────────────────────────
    const submissionOwners: [number, number, number][] = [
      [1, 101, 85], [2, 102, 92], [3, 103, 78], [4, 104, 95], [1, 105, 88],
    ];
    for (const [userId, submissionId, score] of submissionOwners) {
      await userGraph.linkToSubmission(userId, submissionId);
    }
    console.log(`  Submission→User links: ${submissionOwners.length}`);

    // ── 9. Similarity edges ──────────────────────────────────
    const similarityEdges: [number, number, number][] = [
      [101, 103, 0.91],   // Same assignment (Sorting)
      [101, 105, 0.82],   // Same assignment (Sorting)
      [103, 105, 0.73],   // Same assignment (Sorting)
      [102, 104, 0.45],   // Different assignments
    ];
    for (const [idA, idB, score] of similarityEdges) {
      await similarityGraph.createSimilarEdge(idA, idB, score);
    }
    console.log(`  Similarity edges: ${similarityEdges.length}`);

    // ── Verify ───────────────────────────────────────────────
    const result = await session.run(`
      MATCH (n)
      RETURN labels(n) AS labels, count(n) AS count
      ORDER BY labels(n)[0]
    `);
    console.log("\nSeed complete — node counts:");
    for (const record of result.records) {
      console.log(`  ${(record.get("labels") as string[]).join(", ")}: ${record.get("count")}`);
    }
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
