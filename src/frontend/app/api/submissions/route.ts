import { NextResponse } from "next/server";
import { getSubmissionDashboard } from "@/lib/submission-dashboard";
import type { SubmissionDashboardResponse } from "@/types/submission";

export async function GET(): Promise<NextResponse<SubmissionDashboardResponse>> {
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
