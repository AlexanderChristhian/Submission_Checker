import { runQuery } from "./neo4j.client.js";

export interface UserNode {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export const userGraph = {
  async createNode(userId: string, name: string, email: string, role: string) {
    await runQuery(
      `MERGE (u:User {userId: $userId})
       SET u.name = $name,
           u.email = $email,
           u.role = $role,
           u.createdAt = datetime()`,
      { userId, name, email, role }
    );
  },

  async getById(userId: string): Promise<UserNode | null> {
    const result = await runQuery(
      `MATCH (u:User {userId: $userId})
       RETURN u.userId, u.name, u.email, u.role`,
      { userId }
    );
    if (result.records.length === 0) return null;
    const r = result.records[0]!;
    return {
      userId: r.get("u.userId") as string,
      name: r.get("u.name") as string,
      email: r.get("u.email") as string,
      role: r.get("u.role") as string,
    };
  },

  async getAll(): Promise<UserNode[]> {
    const result = await runQuery(
      `MATCH (u:User)
       RETURN u.userId, u.name, u.email, u.role
       ORDER BY u.name`
    );
    return result.records.map((r) => ({
      userId: r.get("u.userId") as string,
      name: r.get("u.name") as string,
      email: r.get("u.email") as string,
      role: r.get("u.role") as string,
    }));
  },

  async findByRole(role: string): Promise<UserNode[]> {
    const result = await runQuery(
      `MATCH (u:User)
       WHERE u.role = $role
       RETURN u.userId, u.name, u.email, u.role
       ORDER BY u.name`,
      { role }
    );
    return result.records.map((r) => ({
      userId: r.get("u.userId") as string,
      name: r.get("u.name") as string,
      email: r.get("u.email") as string,
      role: r.get("u.role") as string,
    }));
  },

  async updateNode(
    userId: string,
    data: Partial<{ name: string; email: string; role: string }>
  ) {
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { userId };

    if (data.name !== undefined) {
      setClauses.push("u.name = $name");
      params["name"] = data.name;
    }
    if (data.email !== undefined) {
      setClauses.push("u.email = $email");
      params["email"] = data.email;
    }
    if (data.role !== undefined) {
      setClauses.push("u.role = $role");
      params["role"] = data.role;
    }
    setClauses.push("u.updatedAt = datetime()");

    await runQuery(
      `MATCH (u:User {userId: $userId})
       SET ${setClauses.join(", ")}`,
      params
    );
  },

  async deleteNode(userId: string) {
    await runQuery(
      `MATCH (u:User {userId: $userId})
       DETACH DELETE u`,
      { userId }
    );
  },

  async linkToSubmission(userId: string, submissionId: number) {
    await runQuery(
      `MATCH (u:User {userId: $userId})
       MATCH (s:Submission {submissionId: $submissionId})
       MERGE (u)-[:SUBMITTED]->(s)`,
      { userId, submissionId }
    );
  },

  async getSubmissions(userId: string) {
    const result = await runQuery(
      `MATCH (u:User {userId: $userId})-[:SUBMITTED]->(s:Submission)
       RETURN s.submissionId, s.title, s.status, s.createdAt
       ORDER BY s.createdAt DESC`,
      { userId }
    );
    return result.records.map((r) => ({
      submissionId: r.get("s.submissionId") as number,
      title: r.get("s.title") as string,
      status: r.get("s.status") as string,
      createdAt: r.get("s.createdAt") as string,
    }));
  },
};
