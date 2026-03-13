import { Router } from "express";
import submissionRoutes from "./submission.routes.js";
import plagiarismRoutes from "./plagiarism.routes.js";

const router = Router();

router.use("/submissions", submissionRoutes);
router.use("/plagiarism", plagiarismRoutes);

export default router;
