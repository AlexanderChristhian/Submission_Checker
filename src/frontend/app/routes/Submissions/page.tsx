import PageShell from "@/components/Layout/PageShell";
import PageHeader from "@/components/UI/PageHeader";
import StatCard from "@/components/UI/StatCard";
import SubmissionsTable from "@/components/UI/SubmissionsTable";
import { getSubmissionDashboard } from "@/lib/submission-dashboard";

export default async function SubmissionsPage() {
  const response = await getSubmissionDashboard();
  const { summary, submissions } = response.data;

  return (
    <PageShell>
      <PageHeader
        title="Submissions"
        description="View and manage all your submissions here."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={summary.total} />
        <StatCard label="Pending" value={summary.pending} />
        <StatCard label="Checked" value={summary.checked} />
        <StatCard label="Avg Grade" value={summary.averageGrade} />
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        Last generated: {new Date(response.generatedAt).toLocaleString("en-US")}
      </p>

      <div className="mt-4">
        <SubmissionsTable title="All Submissions" submissions={submissions} />
      </div>
    </PageShell>
  );
}