export interface CreateSubmissionInput {
    title: string;
    content: string;
    userId: number;
    assignmentId?: number;
    fileName?: string;
    fileUrl?: string;
}
export interface SubmissionResponse {
    id: number;
    title: string;
    content: string;
    status: string;
    userId: number;
    assignmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=submission.types.d.ts.map