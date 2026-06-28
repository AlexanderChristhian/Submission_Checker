import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";
import { NotFoundError } from "../utils/errors.js";

export const gradingRuleController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await prisma.gradingRule.findMany({
        include: { course: { select: { id: true, code: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json({ data: rules });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const rule = await prisma.gradingRule.findUnique({
        where: { id },
        include: { course: { select: { id: true, code: true, name: true } } },
      });
      if (!rule) throw new NotFoundError("GradingRule");
      res.json({ data: rule });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, content, courseId, isActive } = req.body;
      const rule = await prisma.gradingRule.create({
        data: {
          name,
          content,
          courseId: courseId ?? null,
          isActive: isActive ?? true,
        },
        include: { course: { select: { id: true, code: true, name: true } } },
      });
      res.status(201).json({ data: rule });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const { name, content, courseId, isActive } = req.body;
      const rule = await prisma.gradingRule.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(content !== undefined && { content }),
          ...(courseId !== undefined && { courseId }),
          ...(isActive !== undefined && { isActive }),
        },
        include: { course: { select: { id: true, code: true, name: true } } },
      });
      res.json({ data: rule });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      await prisma.gradingRule.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
