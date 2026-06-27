import { Router } from "express";
import submissionRoutes from "./submission.routes.js";
import plagiarismRoutes from "./plagiarism.routes.js";
import courseRoutes from "./course.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import ragRoutes from "./rag.routes.js";
import gradeRoutes from "./grade.routes.js";

const router = Router();

router.use("/submissions", submissionRoutes);
router.use("/plagiarism", plagiarismRoutes);
router.use("/courses", courseRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/rag", ragRoutes);
router.use("/submissions", gradeRoutes);

export default router;
