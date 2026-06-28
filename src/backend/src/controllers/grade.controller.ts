import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";
import { ragService } from "../services/rag.service.js";
import { NotFoundError } from "../utils/errors.js";

export const gradeController = {
  async gradeSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const submission = await prisma.submission.findUnique({
        where: { id },
        include: { user: true, assignment: { include: { course: true } } },
      });
      if (!submission) throw new NotFoundError("Submission");

      const courseId = submission.assignment?.courseId;
      const rule = await prisma.gradingRule.findFirst({
        where: {
          isActive: true,
          OR: [
            ...(courseId !== undefined ? [{ courseId }] : []),
            { courseId: null },
          ],
        },
        orderBy: [{ courseId: "desc" }, { createdAt: "desc" }],
      });

      const evaluation = await ragService.evaluateSubmission(
        id,
        submission.content,
        submission.assignment?.title ?? undefined,
        rule?.content,
      );

      const feedback = evaluation.deductions.length > 0
        ? evaluation.deductions.join("\n")
        : "No issues found — perfect submission.";

      const grade = await prisma.grade.upsert({
        where: { submissionId: id },
        update: { score: evaluation.score, feedback },
        create: { score: evaluation.score, feedback, submissionId: id },
        include: {
          submission: true,
          gradedBy: true,
        },
      });

      await prisma.submission.update({
        where: { id },
        data: { status: "CHECKED" },
      });

      res.json({ data: grade });
    } catch (err) {
      next(err);
    }
  },
};
