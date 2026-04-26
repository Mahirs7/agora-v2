import type { NextRequest } from "next/server";

import { API_BASE } from "@/lib/kosmos";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safeSegments = path.filter((segment) => segment && segment !== "..");
  const upstream = new URL(`/api/${safeSegments.join("/")}`, API_BASE);

  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value);
  });

  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
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
