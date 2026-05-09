import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";

export const courseController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const courses = await prisma.course.findMany({
        include: { assignments: true },
      });
      res.json({ data: courses });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const course = await prisma.course.findUnique({
        where: { id },
        include: { assignments: true },
      });
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      res.json({ data: course });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name } = req.body;
      const course = await prisma.course.create({
        data: { code, name },
      });
      res.status(201).json({ data: course });
    } catch (err) {
      next(err);
    }
  },
};
