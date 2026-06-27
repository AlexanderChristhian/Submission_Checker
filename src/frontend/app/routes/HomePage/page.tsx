"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/Layout/PageShell";
import PageHeader from "@/components/UI/PageHeader";
import StatCard from "@/components/UI/StatCard";
import SubmissionsTable from "@/components/UI/SubmissionsTable";
import UploadFile from "@/components/UI/UploadFile";
import type { SubmissionDashboardResponse, SubmissionPreview } from "@/types/submission";

export default function HomePage() {
  const [data, setData] = useState<SubmissionDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/submissions", {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json: SubmissionDashboardResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshToken]);

  const summary = data?.ok ? data.data.summary : null;
  const submissions: SubmissionPreview[] = data?.ok ? data.data.submissions : [];

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's an overview of your submissions."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Total" value={summary.total} />
          <StatCard label="Pending" value={summary.pending} />
          <StatCard label="Checked" value={summary.checked} />
          <StatCard label="Avg Grade" value={summary.averageGrade} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubmissionsTable title="Recent Submissions" submissions={submissions.slice(0, 10)} onGrade={() => setRefreshToken((t) => t + 1)} />
        </div>
        <div>
          <UploadFile />
        </div>
      </div>
    </PageShell>
  );
}
