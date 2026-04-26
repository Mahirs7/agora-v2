import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const API_BASE = "https://api.kosmos.fyi";

async function proxy(request: NextRequest, segments: string[]) {
  const safeSegments = segments.filter((segment) => segment && segment !== "..");
  const upstream = new URL(`/api/${safeSegments.join("/")}`, API_BASE);

  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value);
  });

  const init: RequestInit = {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    method: request.method,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
    (init.headers as Record<string, string>)["Content-Type"] =
      request.headers.get("content-type") ?? "application/json";
  }

  try {
    const response = await fetch(upstream, init);
    const body = await response.text();

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
      status: response.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach Kosmos API";

    return Response.json(
      { error: `Kosmos proxy failed: ${message}` },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path);
}
