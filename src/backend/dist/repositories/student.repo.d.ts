import type { CreateStudentInput } from "../types/submission.types.js";
export declare const studentRepo: {
    findAll(): Promise<({
        submissions: {
            id: number;
            title: string;
            content: string;
            studentId: number;
        }[];
    } & {
        id: number;
        filename: string;
    })[]>;
    findById(id: number): Promise<({
        submissions: {
            id: number;
            title: string;
            content: string;
            studentId: number;
        }[];
    } & {
        id: number;
        filename: string;
    }) | null>;
    findByFilename(filename: string): Promise<({
        submissions: {
            id: number;
            title: string;
            content: string;
            studentId: number;
        }[];
    } & {
        id: number;
        filename: string;
    }) | null>;
    create(data: CreateStudentInput): Promise<{
        id: number;
        filename: string;
    }>;
    delete(id: number): Promise<{
        id: number;
        filename: string;
    }>;
};
//# sourceMappingURL=student.repo.d.ts.map