import { Router } from "express";
import { submissionController } from "../controllers/submission.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { createSubmissionSchema, updateSubmissionSchema, } from "../validators/submission.validator.js";
const router = Router();
router.get("/", submissionController.getAll);
router.get("/:id", submissionController.getById);
router.post("/", validate(createSubmissionSchema), submissionController.create);
router.put("/:id", validate(updateSubmissionSchema), submissionController.update);
router.delete("/:id", submissionController.delete);
export default router;
//# sourceMappingURL=submission.routes.js.map