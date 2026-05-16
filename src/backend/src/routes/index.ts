import { Router } from "express";
import submissionRoutes from "./submission.routes.js";
import plagiarismRoutes from "./plagiarism.routes.js";
import courseRoutes from "./course.routes.js";
import analyticsRoutes from "./analytics.routes.js";

const router = Router();

router.use("/submissions", submissionRoutes);
router.use("/plagiarism", plagiarismRoutes);
router.use("/courses", courseRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
