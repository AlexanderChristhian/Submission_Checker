"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/UI/StatCard";
import SubmissionsTable from "@/components/UI/SubmissionsTable";
import type { SubmissionDashboardResponse } from "@/types/submission";

function formatGeneratedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("en-US");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function SubmissionsDashboardClient() {
  const [result, setResult] = useState<SubmissionDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    async function fetchDashboard() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/submissions", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        const payload =
          (await response.json()) as SubmissionDashboardResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || payload.ok === false) {
          if (payload.ok === false) {
            setResult(payload);
          } else {
            setResult({
              ok: false,
              error: `Failed to fetch submissions. HTTP ${response.status}.`,
            });
          }
          return;
        }

        setResult(payload);
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }

        setResult({
          ok: false,
          error: "Network error while loading submissions dashboard.",
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [reloadToken]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Loading submissions dashboard...
      </div>
    );
  }

  if (!result || result.ok === false) {
    const message =
      result && result.ok === false
        ? result.error
        : "Unable to load submissions right now.";

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
        <p className="font-semibold">Unable to load submissions data</p>
        <p className="mt-2">{message}</p>
        <button
          type="button"
          onClick={() => setReloadToken((current) => current + 1)}
          className="mt-4 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, submissions } = result.data;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={summary.total} />
        <StatCard label="Pending" value={summary.pending} />
        <StatCard label="Checked" value={summary.checked} />
        <StatCard label="Avg Grade" value={summary.averageGrade} />
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        Last generated: {formatGeneratedAt(result.generatedAt)}
      </p>

      <div className="mt-4">
        <SubmissionsTable title="All Submissions" submissions={submissions} />
      </div>
    </>
  );
}
