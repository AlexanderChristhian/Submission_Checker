import { runQuery } from "./neo4j.client.js";

export interface CourseNode {
  code: string;
  name: string;
  credits: number;
}

export interface StudentInCourse {
  studentId: number;
  name: string;
  enrollmentDate: string;
}

export const courseGraph = {
  async createOrUpdate(course: CourseNode) {
    await runQuery(
      `MERGE (c:Course {code: $code})
       SET c.name = $name, c.credits = $credits, c.updatedAt = datetime()`,
      course as unknown as Record<string, unknown>
    );
  },

  async getByCode(code: string) {
    const result = await runQuery(
      `MATCH (c:Course {code: $code}) RETURN c.code, c.name, c.credits`,
      { code }
    );
    if (result.records.length === 0) return null;
    const record = result.records[0]!;
    return {
      code: record.get("c.code") as string,
      name: record.get("c.name") as string,
      credits: record.get("c.credits") as number,
    };
  },

  async getAll() {
    const result = await runQuery(
      `MATCH (c:Course) RETURN c.code, c.name, c.credits ORDER BY c.code`
    );
    return result.records.map((r) => ({
      code: r.get("c.code") as string,
      name: r.get("c.name") as string,
      credits: r.get("c.credits") as number,
    }));
  },

  async enrollStudent(courseCode: string, studentId: number, studentName: string, semester: string) {
    await runQuery(
      `MATCH (c:Course {code: $courseCode})
       MERGE (s:Student {studentId: $studentId})
       ON CREATE SET s.name = $studentName
       MERGE (s)-[:ENROLLED_IN {semester: $semester}]->(c)`,
      { courseCode, studentId, studentName, semester }
    );
  },

  async getStudents(courseCode: string): Promise<StudentInCourse[]> {
    const result = await runQuery(
      `MATCH (s:Student)-[e:ENROLLED_IN]->(c:Course {code: $courseCode})
       RETURN s.studentId, s.name, e.semester AS semester
       ORDER BY s.name`,
      { courseCode }
    );
    return result.records.map((r) => ({
      studentId: r.get("s.studentId") as number,
      name: r.get("s.name") as string,
      enrollmentDate: r.get("semester") as string,
    }));
  },

  async deleteByCode(code: string) {
    await runQuery(
      `MATCH (c:Course {code: $code}) DETACH DELETE c`,
      { code }
    );
  },
};
