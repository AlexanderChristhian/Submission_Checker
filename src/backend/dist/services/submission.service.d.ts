import type { CreateSubmissionInput } from "../types/submission.types.js";
export declare const submissionService: {
    getAll(): Promise<({
        user: {
            name: string;
            id: string;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            emailVerified: boolean;
            image: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        grades: {
            id: number;
            createdAt: Date;
            score: number;
            feedback: string | null;
            submissionId: number;
            gradedById: string | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        assignmentId: number | null;
    })[]>;
    getById(id: number): Promise<{
        user: {
            name: string;
            id: string;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            emailVerified: boolean;
            image: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        assignmentId: number | null;
    }>;
    create(data: CreateSubmissionInput): Promise<{
        user: {
            name: string;
            id: string;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            emailVerified: boolean;
            image: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        assignmentId: number | null;
    }>;
    update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>): Promise<{
        user: {
            name: string;
            id: string;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            emailVerified: boolean;
            image: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        assignmentId: number | null;
    }>;
    delete(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        assignmentId: number | null;
    }>;
};
//# sourceMappingURL=submission.service.d.ts.map