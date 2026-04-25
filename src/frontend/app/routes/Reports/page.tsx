import PageHeader from "@/components/UI/PageHeader";
import PageShell from "@/components/Layout/PageShell";
import SubmissionInsightCard from "@/components/UI/SubmissionInsightCard";

interface SimilarityAlert {
  id: string;
  title: string;
  similarity: number;
  status: "Queued" | "Review Needed" | "Escalated";
}

const similarityAlerts: SimilarityAlert[] = [
  {
    id: "SUB-1103",
    title: "Database Mini Project",
    similarity: 87.3,
    status: "Escalated",
  },
  {
    id: "SUB-1108",
    title: "Operating Systems Reflection",
    similarity: 73.5,
    status: "Review Needed",
  },
  {
    id: "SUB-1112",
    title: "Web Security Assignment",
    similarity: 66.1,
    status: "Queued",
  },
];

const statusColors: Record<SimilarityAlert["status"], string> = {
  Queued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Review Needed":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function ReportsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Reports"
        description="Track submission quality, risk signals, and review workload."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SubmissionInsightCard
          title="Weekly Submission Count"
          value="42"
          description="Total incoming submissions from all active courses this week."
          tone="neutral"
        />
        <SubmissionInsightCard
          title="Checked Within 24h"
          value="81%"
          description="On-time checking throughput improved by 6% from last week."
          tone="success"
        />
        <SubmissionInsightCard
          title="Flagged Similarity"
          value="7"
          description="Submissions above threshold waiting for manual confirmation."
          tone="warning"
        />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          High Similarity Queue
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="pb-3 font-medium">Submission ID</th>
                <th className="pb-3 font-medium">Title</th>
                <th className="pb-3 font-medium">Similarity</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {similarityAlerts.map((alert) => (
                <tr key={alert.id} className="text-zinc-700 dark:text-zinc-300">
                  <td className="py-3 font-mono text-xs">{alert.id}</td>
                  <td className="py-3">{alert.title}</td>
                  <td className="py-3 font-semibold">{alert.similarity}%</td>
                  <td className="py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[alert.status]}`}
                    >
                      {alert.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
