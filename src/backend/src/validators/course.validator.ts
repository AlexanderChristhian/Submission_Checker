import { z } from "zod";

export const createCourseSchema = z.object({
  code: z.string().min(1, "Course code is required"),
  name: z.string().min(1, "Course name is required"),
});
