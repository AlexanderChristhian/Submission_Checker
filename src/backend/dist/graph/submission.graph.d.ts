export interface SubmissionNode {
    submissionId: number;
    title: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}
export declare const submissionGraph: {
    createNode(submissionId: number, title: string, status?: string): Promise<void>;
    getById(submissionId: number): Promise<SubmissionNode | null>;
    getAll(): Promise<SubmissionNode[]>;
    findByStatus(status: string): Promise<SubmissionNode[]>;
    updateNode(submissionId: number, data: Partial<{
        title: string;
        status: string;
    }>): Promise<void>;
    deleteNode(submissionId: number): Promise<void>;
    createSectionNode(submissionId: number, sectionIndex: number, content: string, wordCount?: number): Promise<void>;
    updateSectionNode(submissionId: number, sectionIndex: number, data: Partial<{
        content: string;
        wordCount: number;
    }>): Promise<void>;
    deleteSectionNode(submissionId: number, sectionIndex: number): Promise<void>;
    getSections(submissionId: number): Promise<{
        sectionIndex: number;
        content: string;
        wordCount: number;
    }[]>;
    deleteAllSections(submissionId: number): Promise<void>;
};
//# sourceMappingURL=submission.graph.d.ts.map