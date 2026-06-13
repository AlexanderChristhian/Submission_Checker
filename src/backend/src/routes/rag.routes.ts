import { Router, type Request, type Response, type NextFunction } from "express";
import { ragService } from "../services/rag.service.js";
import { AppError } from "../utils/errors.js";

const router = Router();

router.post("/query/rag", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, top_k } = req.body;
    if (!query || typeof query !== "string") {
      throw new AppError("query is required and must be a string", 400);
    }
    const result = await ragService.queryRag(query, top_k ?? 5);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/query/graphrag", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, top_k } = req.body;
    if (!query || typeof query !== "string") {
      throw new AppError("query is required and must be a string", 400);
    }
    const result = await ragService.queryGraphRag(query, top_k ?? 5);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/query/hybrid-graph", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, top_k, fusion, alpha } = req.body;
    if (!query || typeof query !== "string") {
      throw new AppError("query is required and must be a string", 400);
    }
    const result = await ragService.queryHybridGraph(query, top_k ?? 5, fusion, alpha);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/query/hybrid", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, top_k, fusion_mode } = req.body;
    if (!query || typeof query !== "string") {
      throw new AppError("query is required and must be a string", 400);
    }
    const result = await ragService.queryHybrid(query, top_k ?? 5, fusion_mode);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/query/multi-step", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, top_k, enable_decomposition, use_hybrid } = req.body;
    if (!query || typeof query !== "string") {
      throw new AppError("query is required and must be a string", 400);
    }
    const result = await ragService.queryMultiStep(
      query,
      top_k ?? 5,
      enable_decomposition ?? true,
      use_hybrid ?? true
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/index", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submission_id, content } = req.body;
    if (!submission_id || !content) {
      throw new AppError("submission_id and content are required", 400);
    }
    await ragService.indexDocument(submission_id, content);
    res.json({ status: "indexed" });
  } catch (err) {
    next(err);
  }
});

router.post("/similar", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submission_id, text, top_k } = req.body;
    let result;
    if (text) {
      result = await ragService.findSimilarByText(text, top_k ?? 10);
    } else if (submission_id) {
      result = await ragService.findSimilar(submission_id, top_k ?? 10);
    } else {
      throw new AppError("submission_id or text is required", 400);
    }
    res.json({ matches: result });
  } catch (err) {
    next(err);
  }
});

router.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await ragService.healthCheck();
    res.json({ status: ok ? "ok" : "degraded" });
  } catch (err) {
    next(err);
  }
});

export default router;
