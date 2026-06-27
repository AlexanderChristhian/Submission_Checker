export interface CreateSubmissionInput {
  title: string;
  content: string;
  userId: string;
  assignmentId?: number;
  fileName?: string;
  fileUrl?: string;
}

export interface SubmissionResponse {
  id: number;
  title: string;
  content: string;
  status: string;
  userId: string;
  assignmentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
