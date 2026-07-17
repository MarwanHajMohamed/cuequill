import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { withAuth } from "next-auth/middleware";
import { rateLimit } from "@/lib/rateLimit";

// Edge middleware with two jobs:
//   1. IP rate limiting for /api/* (abuse + credential-stuffing guard).
//   2. The existing next-auth guard for protected pages, so unauthenticated
//      visitors never get server-rendered app HTML.
// One middleware file per app, so both live here.

const authMiddleware = withAuth({ pages: { signIn: "/login" } });

// Client IP from the standard proxy headers (Vercel/most hosts set these).
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Per-window limits, chosen so normal usage never trips them:
//   - credential sign-in: tight, to blunt brute force / stuffing.
//   - waitlist: modest, to stop signup spam.
//   - everything else: a generous general cap against floods.
const WINDOW_MS = 60_000;
function limitFor(pathname: string, method: string): number | null {
  // Server-to-server endpoints must never be throttled.
  if (pathname.startsWith("/api/stripe") || pathname.startsWith("/api/cron")) {
    return null;
  }
  if (
    method === "POST" &&
    pathname.startsWith("/api/auth/callback/credentials")
  ) {
    return 10;
  }
  if (pathname.startsWith("/api/waitlist")) return 8;
  return 120;
}

type MiddlewareResult =
  | Response
  | Promise<Response | undefined>
  | undefined;
type MiddlewareFn = (req: NextRequest, event: NextFetchEvent) => MiddlewareResult;

export default function middleware(
  req: NextRequest,
  event: NextFetchEvent,
): MiddlewareResult {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    const limit = limitFor(pathname, req.method);
    if (limit === null) return NextResponse.next();

    // Bucket per IP + coarse route group so a burst on one endpoint doesn't
    // exhaust another's budget.
    const group = pathname.startsWith("/api/auth/callback/credentials")
      ? "auth"
      : pathname.startsWith("/api/waitlist")
        ? "waitlist"
        : "general";
    const { ok, retryAfter } = rateLimit(
      `${clientIp(req)}:${group}`,
      limit,
      WINDOW_MS,
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    return NextResponse.next();
  }

  // Protected pages → delegate to the next-auth guard.
  return (authMiddleware as unknown as MiddlewareFn)(req, event);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/calendar/:path*",
    "/trades/:path*",
    "/chat/:path*",
    "/strategies/:path*",
    "/strategies_used/:path*",
    "/rules/:path*",
    "/goals/:path*",
    "/affirmations/:path*",
    "/earnings/:path*",
    "/community/:path*",
  ],
};
