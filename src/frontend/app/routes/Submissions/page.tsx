import PageShell from "@/components/Layout/PageShell";
import PageHeader from "@/components/UI/PageHeader";
import SubmissionsDashboardClient from "../../../components/UI/SubmissionsDashboardClient";

export default function SubmissionsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Submissions"
        description="View and manage all your submissions here."
      />
      <SubmissionsDashboardClient />
    </PageShell>
  );
}