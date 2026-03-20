/**
 * E2E-only proxy route: /diary/:path* → diary-api (E2E_API_TARGET).
 *
 * In normal development and production, E2E_API_TARGET is never set, so every
 * request immediately returns 404. The route exists solely so that Next.js
 * Server Components can call fetch("/diary/...") during E2E test runs — the
 * same relative path the real gateway handles in production.
 *
 * Security: only active when the E2E_API_TARGET env var is explicitly set.
 * This var is passed to diary-web by the E2E global-setup and is never present
 * in any production or normal-development environment.
 */
import { type NextRequest, NextResponse } from "next/server";


const E2E_API_TARGET = process.env.E2E_API_TARGET;
const E2E_SERVICE_TOKEN = process.env.E2E_SERVICE_TOKEN;
const E2E_USER_ID = process.env.E2E_USER_ID;

async function proxy(
  req: NextRequest,
  params: Promise<{ path: string[] }>,
): Promise<NextResponse> {
  if (!E2E_API_TARGET || !E2E_SERVICE_TOKEN || !E2E_USER_ID) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { path } = await params;
  const targetUrl = `${E2E_API_TARGET}/${path.join("/")}${req.nextUrl.search}`;

  const forwardHeaders: Record<string, string> = {
    "x-service-token": E2E_SERVICE_TOKEN,
    "x-user-id": E2E_USER_ID,
  };
  const contentType = req.headers.get("content-type");
  if (contentType) forwardHeaders["content-type"] = contentType;

  const body =
    req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body: body ? Buffer.from(body) : undefined,
  });

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  proxy(req, params);

export const POST = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  proxy(req, params);

export const PATCH = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  proxy(req, params);

export const DELETE = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  proxy(req, params);
