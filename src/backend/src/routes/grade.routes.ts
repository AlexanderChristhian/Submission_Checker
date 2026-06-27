import { Router } from "express";
import { gradeController } from "../controllers/grade.controller.js";

const router = Router();

router.post("/:id/grade", gradeController.gradeSubmission);

export default router;
