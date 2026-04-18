import type {
  ApiResponse,
  SubmissionDashboardData,
  SubmissionPatch,
  SubmissionPreview,
  SubmissionRecord,
  SubmissionStatus,
} from "@/types/submission";

const submissionSeed: SubmissionRecord[] = [
  {
    id: "SUB-1101",
    title: "Operating Systems Lab Report",
    course: "CS302",
    submittedAt: "2026-04-14T10:00:00.000Z",
    status: "Checked",
    grade: 93,
    similarityScore: 11.9,
    fileUrl: "https://example.com/files/sub-1101.pdf",
  },
  {
    id: "SUB-1102",
    title: "Machine Learning Reflection",
    course: "CS410",
    submittedAt: "2026-04-15T06:30:00.000Z",
    status: "Pending",
    grade: null,
    similarityScore: null,
    fileUrl: "https://example.com/files/sub-1102.pdf",
  },
  {
    id: "SUB-1103",
    title: "Database Mini Project",
    course: "CS320",
    submittedAt: "2026-04-15T08:45:00.000Z",
    status: "Flagged",
    grade: null,
    similarityScore: 87.3,
    fileUrl: "https://example.com/files/sub-1103.pdf",
  },
  {
    id: "SUB-1104",
    title: "Distributed Systems Quiz",
    course: "CS450",
    submittedAt: "2026-04-16T11:20:00.000Z",
    status: "Checked",
    grade: 88,
    similarityScore: 8.4,
    fileUrl: "https://example.com/files/sub-1104.pdf",
  },
  {
    id: "SUB-1105",
    title: "Software Engineering Proposal",
    course: "CS360",
    submittedAt: "2026-04-16T15:10:00.000Z",
    status: "Pending",
    grade: null,
    similarityScore: 19.1,
    fileUrl: "https://example.com/files/sub-1105.pdf",
  },
];

function isSubmissionRecord(value: unknown): value is SubmissionRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.submittedAt === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.fileUrl === "string"
  );
}

function ensureSubmissionList(value: unknown): SubmissionRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isSubmissionRecord);
}

function countByStatus<T extends { status: SubmissionStatus }>(items: T[]): Record<SubmissionStatus, number> {
  return items.reduce<Record<SubmissionStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { Checked: 0, Pending: 0, Flagged: 0 },
  );
}

function averageGrade(items: SubmissionRecord[]): number {
  const graded = items.filter((item) => item.grade !== null);
  if (!graded.length) {
    return 0;
  }

  const total = graded.reduce((sum, item) => sum + (item.grade ?? 0), 0);
  return Math.round((total / graded.length) * 100) / 100;
}

function toPreview(item: SubmissionRecord): SubmissionPreview {
  return {
    id: item.id,
    title: item.title,
    submittedAt: item.submittedAt,
    status: item.status,
    grade: item.grade,
    fileUrl: item.fileUrl,
  };
}

export function applySubmissionPatch(
  record: SubmissionRecord,
  patch: SubmissionPatch,
): SubmissionRecord {
  return {
    ...record,
    ...patch,
  };
}

export async function getSubmissionDashboard(): Promise<ApiResponse<SubmissionDashboardData>> {
  const safeRecords = ensureSubmissionList(submissionSeed);
  const statusCount = countByStatus(safeRecords);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    data: {
      summary: {
        total: safeRecords.length,
        pending: statusCount.Pending,
        checked: statusCount.Checked,
        flagged: statusCount.Flagged,
        averageGrade: averageGrade(safeRecords),
      },
      submissions: safeRecords.map(toPreview),
    },
  };
}
