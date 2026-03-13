import { z } from "zod";
export declare const createSubmissionSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    studentId: z.ZodNumber;
}, z.core.$strip>;
export declare const updateSubmissionSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=submission.validator.d.ts.map