import type { CreateSubmissionInput } from "../types/submission.types.js";
export declare const submissionService: {
    getAll(): Promise<any>;
    getById(id: number): Promise<any>;
    create(data: CreateSubmissionInput): Promise<any>;
    update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>): Promise<any>;
    delete(id: number): Promise<any>;
};
//# sourceMappingURL=submission.service.d.ts.map