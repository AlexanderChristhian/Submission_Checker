"use client";

import { useState } from "react";
import DataTable from "@/components/UI/DataTable";
import StatusBadge from "@/components/UI/StatusBadge";
import GradeBadge from "@/components/UI/GradeBadge";
import type { SubmissionPreview } from "@/types/submission";

function formatDate(dateValue: string): string {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface SubmissionsTableProps {
  title: string;
  submissions: SubmissionPreview[];
  onGrade?: () => void;
}

export default function SubmissionsTable({ title, submissions, onGrade }: SubmissionsTableProps) {
  const [gradingIds, setGradingIds] = useState<Set<string>>(new Set());
  const [gradeResults, setGradeResults] = useState<Record<string, { score: number; feedback: string }>>({});
  const [gradeError, setGradeError] = useState<string | null>(null);

  function hasGrade(sub: SubmissionPreview): boolean {
    return sub.grade !== null || gradeResults[sub.id] !== undefined;
  }

  async function handleGrade(id: string) {
    setGradingIds((prev) => new Set(prev).add(id));
    setGradeError(null);
    try {
      const res = await fetch(`/api/submissions/${id}/grade`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Grading failed");
      }
      setGradeResults((prev) => ({
        ...prev,
        [id]: { score: data.data.score, feedback: data.data.feedback },
      }));
      onGrade?.();
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Grading failed");
    } finally {
      setGradingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (submissions.length === 0) {
    return (
      <DataTable title={title}>
        No submissions yet.
      </DataTable>
    );
  }

  return (
    <DataTable title={title}>
      {gradeError && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {gradeError}
        </div>
      )}
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            <th className="pb-3 font-medium">ID</th>
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Grade</th>
            <th className="pb-3 font-medium">Notes</th>
            <th className="pb-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {submissions.map((sub) => {
            const result = gradeResults[sub.id];
            const displayGrade = result?.score ?? sub.grade;
            const displayStatus = result ? "Checked" : sub.status;
            return (
              <tr key={sub.id} className="text-zinc-700 dark:text-zinc-300">
                <td className="py-3 font-mono text-xs">{sub.id}</td>
                <td className="py-3">
                  <a href={sub.fileUrl} className="text-blue-500 hover:text-blue-700" target="_blank" rel="noopener noreferrer">
                      {sub.title}
                  </a>
                </td>
                <td className="py-3 text-zinc-500 dark:text-zinc-400">{formatDate(sub.submittedAt)}</td>
                <td className="py-3">
                  <StatusBadge status={displayStatus as any} />
                </td>
                <td className="py-3">
                  <GradeBadge grade={displayGrade === null ? "N/A" : String(displayGrade)} />
                </td>
                <td className="py-3 max-w-xs truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {result?.feedback ?? sub.feedback ?? "—"} 
                </td>
                <td className="py-3">
                  <button
                    onClick={() => {
                      if (hasGrade(sub) && !window.confirm("Regrade this submission?")) return;
                      handleGrade(sub.id);
                    }}
                    disabled={gradingIds.has(sub.id)}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {gradingIds.has(sub.id) ? "Grading..." : hasGrade(sub) ? "Regrade" : "Grade"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTable>
  );
}
