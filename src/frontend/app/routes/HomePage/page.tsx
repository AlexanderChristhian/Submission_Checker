import PageShell from "@/components/Layout/PageShell";
import PageHeader from "@/components/UI/PageHeader";
import StatCard from "@/components/UI/StatCard";
import SubmissionsTable from "@/components/UI/SubmissionsTable";
import UploadFile from "@/components/UI/UploadFile";

const stats = [
  { label: "Total Submissions", value: 67 },
  { label: "Pending Review", value: 12 },
  { label: "Checked", value: 55 },
];

const recentSubmissions = [
  { id: "SUB-1042", name: "Lab Report — Physics 201", date: "8 Mar 2026", status: "Checked", fileUrl: "https://example.com/files/sub-1042.pdf", grades: "95" },
  { id: "SUB-1041", name: "Essay — Modern Literature", date: "7 Mar 2026", status: "Pending", fileUrl: "https://example.com/files/sub-1041.pdf", grades: "N/A" },
  { id: "SUB-1040", name: "Problem Set 5 — Calculus II", date: "6 Mar 2026", status: "Checked", fileUrl: "https://example.com/files/sub-1040.pdf", grades: "88" },
  { id: "SUB-1039", name: "Research Proposal — Biology", date: "5 Mar 2026", status: "Pending", fileUrl: "https://example.com/files/sub-1039.pdf", grades: "N/A" },
  { id: "SUB-1038", name: "Case Study — Business Ethics", date: "4 Mar 2026", status: "Checked", fileUrl: "https://example.com/files/sub-1038.pdf", grades: "92" },
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