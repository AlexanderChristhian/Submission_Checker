import { NextRequest, NextResponse } from "next/server";
import { getSubmissionDashboard } from "@/lib/submission-dashboard";
import type { SubmissionDashboardResponse } from "@/types/submission";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SubmissionDashboardResponse> | Response> {
  const accept = request.headers.get("accept") ?? "";

  if (accept.includes("text/event-stream")) {
    return streamDashboard();
  }

  try {
    const dashboard = await getSubmissionDashboard();
    return NextResponse.json<SubmissionDashboardResponse>(dashboard, {
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
        const dashboard = await getSubmissionDashboard();

        const metadata = `data: ${JSON.stringify({ type: "metadata", total: dashboard.data?.summary.total ?? 0 })}\n\n`;
        controller.enqueue(encoder.encode(metadata));

        const submissions = dashboard.data?.submissions ?? [];
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
