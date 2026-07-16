import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

// Route protection for the PIN gate. Runs on the Edge runtime and only inspects
// the signed session cookie — it never touches the database or the PIN.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isLogin = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth/");

  // Auth endpoints are always reachable (that's how you log in/out).
  if (isAuthApi) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (isLogin) {
    // Already signed in? Skip the login screen.
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (authed) return NextResponse.next();

  // Not authenticated: 401 for API calls, redirect to /login for pages.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
