import { submissionRepo } from "../repositories/submission.repo.js";
import { submissionGraph } from "../graph/submission.graph.js";
import { userGraph } from "../graph/user.graph.js";
import { assignmentGraph } from "../graph/assignment.graph.js";
import { NotFoundError } from "../utils/errors.js";
import type { CreateSubmissionInput } from "../types/submission.types.js";
import { logger } from "../utils/logger.js";

async function syncToNeo4j(submissionId: number, title: string, userId?: number, assignmentId?: number): Promise<void> {
  try {
    await submissionGraph.createNode(submissionId, title);

    if (userId !== undefined) {
      await userGraph.linkToSubmission(userId, submissionId);
    }

    if (assignmentId !== undefined) {
      await assignmentGraph.linkSubmission(assignmentId, submissionId);
    }
  } catch (err) {
    logger.warn(
      { submissionId, err },
      "Failed to sync to Neo4j — graph features may be unavailable"
    );
  }
}

export const submissionService = {
  async getAll() {
    return submissionRepo.findAll();
  },

  async getById(id: number) {
    const submission = await submissionRepo.findById(id);
    if (!submission) {
      throw new NotFoundError("Submission");
    }
    return submission;
  },

  async create(data: CreateSubmissionInput) {
    // 1. Save to SQL
    const submission = await submissionRepo.create(data);

    // 2. Sync to Neo4j (node + relationships) in the same request
    await syncToNeo4j(submission.id, submission.title, data.userId, data.assignmentId);

    return submission;
  },

  async update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>) {
    await submissionService.getById(id); // throws if not found

    // 1. Update SQL
    const updated = await submissionRepo.update(id, data);

    // 2. Sync title change to Neo4j
    if (data.title !== undefined) {
      try {
        await submissionGraph.updateNode(id, { title: data.title });
      } catch (err) {
        logger.warn({ submissionId: id, err }, "Failed to update Neo4j node title");
      }
    }

    return updated;
  },

  async delete(id: number) {
    await submissionService.getById(id); // throws if not found

    // Remove from Neo4j graph first
    try {
      await submissionGraph.deleteNode(id);
    } catch (err) {
      logger.warn({ submissionId: id, err }, "Failed to delete Neo4j node");
    }

    return submissionRepo.delete(id);
  },
};
