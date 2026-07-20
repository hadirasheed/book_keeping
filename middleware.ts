import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Auth gate backed by Supabase Auth (Google OAuth). Refreshes the session
// cookie on every request, redirects unauthenticated users to /login, and
// restricts /admin (and admin APIs) to the configured ADMIN_EMAIL.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = req.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/auth/");

  if (!user) {
    if (isPublic) return res;
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated — keep users off the login page.
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin gate.
  const admin = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const isAdmin = Boolean(admin) && user.email?.toLowerCase() === admin;
  const adminScoped =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/ai-models");
  if (adminScoped && !isAdmin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
