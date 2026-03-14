import type { CreateSubmissionInput } from "../types/submission.types.js";
export declare const submissionRepo: {
    findAll(): Promise<any>;
    findById(id: number): Promise<any>;
    create(data: CreateSubmissionInput): Promise<any>;
    update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>): Promise<any>;
    delete(id: number): Promise<any>;
};
//# sourceMappingURL=submission.repo.d.ts.map