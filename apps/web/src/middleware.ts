import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("dm_access") || req.cookies.has("dm_refresh");
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/login", "/register"] };
