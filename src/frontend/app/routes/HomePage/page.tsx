import PageShell from "@/components/Layout/PageShell";
import PageHeader from "@/components/UI/PageHeader";
import StatCard from "@/components/UI/StatCard";
import SubmissionsTable from "@/components/UI/SubmissionsTable";
import UploadFile from "@/components/UI/UploadFile";
import type { SubmissionPreview } from "@/types/submission";

const stats = [
  { label: "Total Submissions", value: 67 },
  { label: "Pending Review", value: 12 },
  { label: "Checked", value: 55 },
];

const recentSubmissions: SubmissionPreview[] = [
  {
    id: "SUB-1042",
    title: "Lab Report - Physics 201",
    submittedAt: "2026-03-08T10:00:00.000Z",
    status: "Checked",
    fileUrl: "https://example.com/files/sub-1042.pdf",
    grade: 95,
  },
  {
    id: "SUB-1041",
    title: "Essay - Modern Literature",
    submittedAt: "2026-03-07T10:00:00.000Z",
    status: "Pending",
    fileUrl: "https://example.com/files/sub-1041.pdf",
    grade: null,
  },
  {
    id: "SUB-1040",
    title: "Problem Set 5 - Calculus II",
    submittedAt: "2026-03-06T10:00:00.000Z",
    status: "Checked",
    fileUrl: "https://example.com/files/sub-1040.pdf",
    grade: 88,
  },
  {
    id: "SUB-1039",
    title: "Research Proposal - Biology",
    submittedAt: "2026-03-05T10:00:00.000Z",
    status: "Pending",
    fileUrl: "https://example.com/files/sub-1039.pdf",
    grade: null,
  },
  {
    id: "SUB-1038",
    title: "Case Study - Business Ethics",
    submittedAt: "2026-03-04T10:00:00.000Z",
    status: "Checked",
    fileUrl: "https://example.com/files/sub-1038.pdf",
    grade: 92,
  },
];

export default function HomePage() {
  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's an overview of your submissions."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value }) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>

      <SubmissionsTable title="Recent Submissions" submissions={recentSubmissions} />
        <UploadFile />
    </PageShell>
  );
}