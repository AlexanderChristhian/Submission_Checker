import { submissionRepo } from "../repositories/submission.repo.js";
import { submissionGraph } from "../graph/submission.graph.js";
import { NotFoundError } from "../utils/errors.js";
import type { CreateSubmissionInput } from "../types/submission.types.js";
import { logger } from "../utils/logger.js";

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

    // 2. Create Neo4j node for plagiarism graph
    try {
      await submissionGraph.createNode(submission.id, submission.title);
    } catch (err) {
      logger.warn({ submissionId: submission.id, err }, "Failed to create Neo4j node — graph features may be unavailable");
    }

    return submission;
  },

  async update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>) {
    await submissionService.getById(id); // throws if not found
    return submissionRepo.update(id, data);
  },

  async delete(id: number) {
    await submissionService.getById(id); // throws if not found

    // Remove from Neo4j graph
    try {
      await submissionGraph.deleteNode(id);
    } catch (err) {
      logger.warn({ submissionId: id, err }, "Failed to delete Neo4j node");
    }

    return submissionRepo.delete(id);
  },
};
