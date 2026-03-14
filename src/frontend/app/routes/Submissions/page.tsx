import PageShell from "@/components/Layout/PageShell";
import PageHeader from "@/components/UI/PageHeader";
import SubmissionsTable from "@/components/UI/SubmissionsTable";

export default function SubmissionsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Submissions"
        description="View and manage all your submissions here."
      />
      <SubmissionsTable title="All Submissions" submissions={[]} />
    </PageShell>
  );
}