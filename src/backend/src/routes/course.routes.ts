import { Router } from "express";
import { courseController } from "../controllers/course.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { createCourseSchema } from "../validators/course.validator.js";

const router = Router();

router.get("/", courseController.getAll);
router.get("/:id", courseController.getById);
router.post("/", validate(createCourseSchema), courseController.create);

export default router;
