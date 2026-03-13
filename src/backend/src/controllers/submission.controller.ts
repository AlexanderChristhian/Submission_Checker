import type { Request, Response, NextFunction } from "express";
import { submissionService } from "../services/submission.service.js";

export const submissionController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const submissions = await submissionService.getAll();
      res.json({ data: submissions });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const submission = await submissionService.getById(id);
      res.json({ data: submission });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const submission = await submissionService.create(req.body);
      res.status(201).json({ data: submission });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const submission = await submissionService.update(id, req.body);
      res.json({ data: submission });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      await submissionService.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
