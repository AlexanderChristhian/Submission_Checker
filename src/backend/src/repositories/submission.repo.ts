import { prisma } from "../config/database.js";
import type { CreateSubmissionInput } from "../types/submission.types.js";

export const submissionRepo = {
  async findAll() {
    return prisma.submission.findMany({
      include: { user: true, grades: true },
      orderBy: { id: "desc" },
    });
  },

  async findById(id: number) {
    return prisma.submission.findUnique({
      where: { id },
      include: { user: true },
    });
  },

  async create(data: CreateSubmissionInput) {
    return prisma.submission.create({
      data: {
        title: data.title,
        content: data.content,
        userId: data.userId,
        assignmentId: data.assignmentId ?? null,
        fileName: data.fileName ?? null,
        fileUrl: data.fileUrl ?? null,
      },
      include: { user: true },
    });
  },

  async update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>) {
    return prisma.submission.update({
      where: { id },
      data,
      include: { user: true },
    });
  },

  async delete(id: number) {
    return prisma.submission.delete({ where: { id } });
  },
};
