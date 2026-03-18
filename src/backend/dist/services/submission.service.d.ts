import type { CreateSubmissionInput } from "../types/submission.types.js";
export declare const submissionService: {
    getAll(): Promise<({
        user: {
            name: string;
            id: number;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        userId: number;
        assignmentId: number | null;
    })[]>;
    getById(id: number): Promise<{
        user: {
            name: string;
            id: number;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        userId: number;
        assignmentId: number | null;
    }>;
    create(data: CreateSubmissionInput): Promise<{
        user: {
            name: string;
            id: number;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        userId: number;
        assignmentId: number | null;
    }>;
    update(id: number, data: Partial<Pick<CreateSubmissionInput, "title" | "content">>): Promise<{
        user: {
            name: string;
            id: number;
            email: string;
            role: import("../../generated/prisma/index.js").$Enums.Role;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        userId: number;
        assignmentId: number | null;
    }>;
    delete(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileName: string | null;
        fileUrl: string | null;
        status: import("../../generated/prisma/index.js").$Enums.SubmissionStatus;
        chromaDocId: string | null;
        neo4jNodeId: string | null;
        userId: number;
        assignmentId: number | null;
    }>;
};
//# sourceMappingURL=submission.service.d.ts.map