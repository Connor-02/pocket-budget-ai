import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "pba_session";

function hasSession(request: NextRequest) {
  return Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

function isProtectedPage(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/transactions") || pathname.startsWith("/setup");
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasSession(request);

  if (!authenticated && isProtectedPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  if (!authenticated && isProtectedApi(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth", "/dashboard/:path*", "/transactions/:path*", "/setup/:path*", "/api/:path*"],
};
