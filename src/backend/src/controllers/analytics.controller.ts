import type { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service.js";

export const analyticsController = {
  // ── Analytics ──────────────────────────────────────────────
  async getNodeCounts(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getNodeCounts();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getSimilarityDistribution(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getSimilarityDistribution();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getClusters(req: Request, res: Response, next: NextFunction) {
    try {
      const minScore = req.query["minScore"]
        ? Number(req.query["minScore"])
        : 0.8;
      const data = await analyticsService.detectPlagiarismClusters(minScore);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getStudentGraph(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = Number(req.params["studentId"]);
      const data = await analyticsService.getStudentSubmissionGraph(studentId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getTopPairs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query["limit"] ? Number(req.query["limit"]) : 20;
      const minScore = req.query["minScore"]
        ? Number(req.query["minScore"])
        : 0.5;
      const data = await analyticsService.getTopSimilarPairs(limit, minScore);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getByScoreRange(req: Request, res: Response, next: NextFunction) {
    try {
      const minScore = Number(req.query["minScore"] ?? 0);
      const maxScore = Number(req.query["maxScore"] ?? 100);
      const data = await analyticsService.getSubmissionsByScoreRange(
        minScore,
        maxScore
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getCourseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const courseCode = req.params["courseCode"] as string;
      const flagThreshold = req.query["flagThreshold"]
        ? Number(req.query["flagThreshold"])
        : 0.7;
      const data = await analyticsService.getCourseSimilarityReport(
        courseCode,
        flagThreshold
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const property = (req.query["property"] as string) ?? "title";
      const query = req.query["q"] as string;
      const mode = (req.query["mode"] as "contains" | "startsWith") ?? "contains";

      if (!query) {
        res.status(400).json({ error: "Query parameter 'q' is required" });
        return;
      }

      const data = await analyticsService.searchNodes(property, query, mode);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getFlaggedStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const minScore = req.query["minScore"]
        ? Number(req.query["minScore"])
        : 0.8;
      const data = await analyticsService.getFlaggedStudents(minScore);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getSubmissionPath(req: Request, res: Response, next: NextFunction) {
    try {
      const submissionId = Number(req.params["submissionId"]);
      const data = await analyticsService.getSubmissionPath(submissionId);
      if (!data) {
        res.status(404).json({ error: "Submission not found in graph" });
        return;
      }
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getGraphStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getGraphStats();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getRelationshipTypeCounts(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getRelationshipTypeCounts();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getScorePercentiles(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getSubmissionScorePercentiles();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  // ── Paths ──────────────────────────────────────────────────
  async getShortestPath(req: Request, res: Response, next: NextFunction) {
    try {
      const idA = Number(req.params["idA"]);
      const idB = Number(req.params["idB"]);
      const data = await analyticsService.findShortestPath(idA, idB);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getStudentPaths(req: Request, res: Response, next: NextFunction) {
    try {
      const idA = Number(req.params["idA"]);
      const idB = Number(req.params["idB"]);
      const maxHops = req.query["maxHops"] ? Number(req.query["maxHops"]) : 5;
      const data = await analyticsService.findAllStudentPaths(idA, idB, maxHops);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getSimilarityChain(req: Request, res: Response, next: NextFunction) {
    try {
      const submissionId = Number(req.params["submissionId"]);
      const maxDepth = req.query["maxDepth"] ? Number(req.query["maxDepth"]) : 5;
      const data = await analyticsService.getSimilarityChain(submissionId, maxDepth);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getCentrality(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getSubmissionCentrality();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getConnectedComponents(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.detectConnectedComponents();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getPathStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getPathStats();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getStudentHubScores(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getStudentHubScores();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
};
