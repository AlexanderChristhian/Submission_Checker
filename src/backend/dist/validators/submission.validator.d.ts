import { z } from "zod";
export declare const createSubmissionSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    userId: z.ZodNumber;
    assignmentId: z.ZodOptional<z.ZodNumber>;
    fileName: z.ZodOptional<z.ZodString>;
    fileUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateSubmissionSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=submission.validator.d.ts.map