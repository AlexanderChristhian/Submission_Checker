import { z } from "zod";
export const createSubmissionSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    studentId: z.number().int().positive(),
});
export const updateSubmissionSchema = z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
});
//# sourceMappingURL=submission.validator.js.map