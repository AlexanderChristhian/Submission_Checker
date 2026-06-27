import { z } from "zod";

export const createSubmissionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  userId: z.string().min(1, "UserId is required"),
  assignmentId: z.number().int().positive().optional(),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
});

export const updateSubmissionSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});
