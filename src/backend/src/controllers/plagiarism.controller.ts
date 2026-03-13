import type { Request, Response, NextFunction } from "express";
import { plagiarismService } from "../services/plagiarism.service.js";

export const plagiarismController = {
  async checkSimilarity(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const matches = await plagiarismService.checkSimilarity(id);
      res.json({ data: matches });
    } catch (err) {
      next(err);
    }
  },

  async getSimilar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params["id"]);
      const minScore = req.query["minScore"]
        ? Number(req.query["minScore"])
        : 0.7;
      const similar = await plagiarismService.getSimilarSubmissions(
        id,
        minScore
      );
      res.json({ data: similar });
    } catch (err) {
      next(err);
    }
  },

  async getClusters(req: Request, res: Response, next: NextFunction) {
    try {
      const minScore = req.query["minScore"]
        ? Number(req.query["minScore"])
        : 0.8;
      const clusters = await plagiarismService.getClusters(minScore);
      res.json({ data: clusters });
    } catch (err) {
      next(err);
    }
  },
};
