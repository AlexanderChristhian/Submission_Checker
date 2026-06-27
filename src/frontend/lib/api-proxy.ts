import { NextRequest, NextResponse } from "next/server";

export async function proxyRequest(
  request: NextRequest,
  targetBase: string,
  pathPrefix: string,
): Promise<NextResponse> {
  const url = new URL(request.url);
  const path = url.pathname.replace(pathPrefix, "");
  const search = url.search;
  const targetUrl = `${targetBase}${path}${search}`;

  const body = request.method !== "GET" && request.method !== "HEAD"
    ? await request.blob()
    : undefined;

  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(30000),
    });

    const responseBody = await response.blob();
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 },
    );
  }
}
