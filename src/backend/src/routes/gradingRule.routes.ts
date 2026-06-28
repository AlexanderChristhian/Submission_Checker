import { Router } from "express";
import { gradingRuleController } from "../controllers/gradingRule.controller.js";

const router = Router();

router.get("/", gradingRuleController.getAll);
router.get("/:id", gradingRuleController.getById);
router.post("/", gradingRuleController.create);
router.put("/:id", gradingRuleController.update);
router.delete("/:id", gradingRuleController.remove);

export default router;
