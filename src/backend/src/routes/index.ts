import { Router } from "express";
import submissionRoutes from "./submission.routes.js";
import plagiarismRoutes from "./plagiarism.routes.js";
import courseRoutes from "./course.routes.js";

const router = Router();

router.use("/submissions", submissionRoutes);
router.use("/plagiarism", plagiarismRoutes);
router.use("/courses", courseRoutes);

export default router;
