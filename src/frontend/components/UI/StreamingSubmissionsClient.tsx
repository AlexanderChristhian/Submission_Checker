"use client";

import { useEffect, useState, useRef } from "react";
import type { SubmissionPreview } from "@/types/submission";
import StatCard from "@/components/UI/StatCard";

interface StreamEvent {
  type: "metadata" | "submission" | "complete" | "error";
  data?: SubmissionPreview;
  total?: number;
  error?: string;
}

export default function StreamingSubmissionsClient() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/submissions", {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      try {
        const parsed: StreamEvent = JSON.parse(event.data);

        if (parsed.type === "metadata") {
          setTotal(parsed.total ?? 0);
          setEvents((prev) => [...prev, parsed]);
        } else if (parsed.type === "submission" && parsed.data) {
          setEvents((prev) => [...prev, parsed]);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.addEventListener("complete", () => {
      setIsStreaming(false);
      es.close();
    });

    es.addEventListener("error", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        setError(parsed.error ?? "Streaming error");
      } catch {
        setError("Streaming connection failed");
      }
      setIsStreaming(false);
      es.close();
    });

    es.onerror = () => {
      setError("Connection lost");
      setIsStreaming(false);
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  const submissions = events.filter(
    (e): e is StreamEvent & { data: SubmissionPreview } =>
      e.type === "submission" && e.data !== undefined,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Live Streaming Submissions
          </h3>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span
              className={`inline-block h-2 w-2 rounded-full ${isStreaming ? "animate-pulse bg-green-500" : "bg-zinc-400"}`}
            />
            {isStreaming ? "Streaming..." : "Complete"}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {total !== null
            ? `Loaded ${submissions.length} of ${total} submissions via SSE`
            : "Waiting for stream..."}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">Stream Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {submissions.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Streamed Submissions" value={submissions.length} />
            <StatCard
              label="Status"
              value={
                isStreaming
                  ? "In Progress"
                  : submissions.length === (total ?? 0)
                    ? "All Received"
                    : "Partial"
              }
            />
          </div>

          <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {submissions.map((entry) =>
              entry.data ? (
                <div
                  key={entry.data.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {entry.data.title}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {entry.data.status}
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </>
      )}
    </div>
  );
}
