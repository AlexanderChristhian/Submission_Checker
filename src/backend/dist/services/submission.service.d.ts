import type { CreateSubmissionInput } from "../types/submission.types.js";
export declare const submissionService: {
    getAll(): Promise<({
        student: {
            id: number;
            filename: string;
        };
    } & {
        id: number;
        title: string;
        content: string;
        studentId: number;
    })[]>;
    getById(id: number): Promise<{
        student: {
            id: number;
            filename: string;
        };
    } & {
        id: number;
        title: string;
        content: string;
        studentId: number;
    }>;
    create(data: CreateSubmissionInput): Promise<{
        student: {
            id: number;
            filename: string;
        };
    } & {
        id: number;
        title: string;
        content: string;
        studentId: number;
    }>;
    update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>): Promise<{
        student: {
            id: number;
            filename: string;
        };
    } & {
        id: number;
        title: string;
        content: string;
        studentId: number;
    }>;
    delete(id: number): Promise<{
        id: number;
        title: string;
        content: string;
        studentId: number;
    }>;
};
//# sourceMappingURL=submission.service.d.ts.map