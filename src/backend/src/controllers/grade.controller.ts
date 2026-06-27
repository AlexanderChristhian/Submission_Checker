import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";
import { NotFoundError } from "../utils/errors.js";

export const gradeController = {
  async gradeSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const submission = await prisma.submission.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!submission) throw new NotFoundError("Submission");

      const score = Math.round((60 + Math.random() * 40) * 100) / 100;
      const feedback = `Auto-graded: score ${score}/100`;

      const grade = await prisma.grade.create({
        data: {
          score,
          feedback,
          submissionId: id,
        },
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
