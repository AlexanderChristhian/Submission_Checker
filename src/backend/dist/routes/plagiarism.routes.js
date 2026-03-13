import { Router } from "express";
import { plagiarismController } from "../controllers/plagiarism.controller.js";
const router = Router();
router.post("/:id/check", plagiarismController.checkSimilarity);
router.get("/:id/similar", plagiarismController.getSimilar);
router.get("/clusters", plagiarismController.getClusters);
export default router;
//# sourceMappingURL=plagiarism.routes.js.map