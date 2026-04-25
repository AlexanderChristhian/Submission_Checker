export type SubmissionStatus = "Checked" | "Pending" | "Flagged";

export interface SubmissionRecord {
  id: string;
  title: string;
  course: string;
  submittedAt: string;
  status: SubmissionStatus;
  grade: number | null;
  similarityScore: number | null;
  fileUrl: string;
}

export type SubmissionPreview = Pick<
  SubmissionRecord,
  "id" | "title" | "submittedAt" | "status" | "grade" | "fileUrl"
>;

export type SubmissionPatch = Partial<
  Pick<SubmissionRecord, "status" | "grade" | "similarityScore">
>;

export interface SubmissionSummary {
  total: number;
  pending: number;
  checked: number;
  flagged: number;
  averageGrade: number;
}

export interface SubmissionDashboardData {
  summary: SubmissionSummary;
  submissions: SubmissionPreview[];
}

export interface ApiResponse<T> {
  ok: true;
  data: T;
  generatedAt: string;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type SubmissionDashboardResponse =
  | ApiResponse<SubmissionDashboardData>
  | ApiError;
