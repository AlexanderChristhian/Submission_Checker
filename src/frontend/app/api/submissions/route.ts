import { NextRequest, NextResponse } from "next/server";
import type { SubmissionDashboardResponse } from "@/types/submission";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

async function fetchFromBackend(path: string, options?: RequestInit) {
  const url = `${BACKEND_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
    signal: options?.signal ?? AbortSignal.timeout(10000),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    return {
      ok: false as const,
      error: payload?.error || `Backend returned ${response.status}`,
    };
  }

  return payload;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SubmissionDashboardResponse> | Response> {
  const accept = request.headers.get("accept") ?? "";

  if (accept.includes("text/event-stream")) {
    return streamDashboard();
  }

  try {
    const result = await fetchFromBackend("/api/submissions");

    return NextResponse.json<SubmissionDashboardResponse>(result, {
      status: 200,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json<SubmissionDashboardResponse>(
      {
        ok: false,
        error: `Failed to load submissions dashboard: ${message}`,
      },
      { status: 500 },
    );
  }
}

async function streamDashboard(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await fetchFromBackend("/api/submissions");

        const data = result.data;
        const metadata = `data: ${JSON.stringify({ type: "metadata", total: data?.summary?.total ?? 0 })}\n\n`;
        controller.enqueue(encoder.encode(metadata));

        const submissions = data?.submissions ?? [];
        for (const submission of submissions) {
          const chunk = `data: ${JSON.stringify({ type: "submission", data: submission })}\n\n`;
          controller.enqueue(encoder.encode(chunk));
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        controller.enqueue(encoder.encode("event: complete\ndata: {}\n\n"));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown server error";
        const errorChunk = `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`;
        controller.enqueue(encoder.encode(errorChunk));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
