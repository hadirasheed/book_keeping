import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getCurrentUser, isAdminEmail } from "@/lib/auth-user";

// GET /api/me — current user profile + admin flag.
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getCurrentUser();
  return NextResponse.json({
    email: authUser.email,
    name: user?.name ?? null,
    isAdmin: isAdminEmail(authUser.email),
  });
}

// PATCH /api/me — update the current user's display name.
export async function PATCH(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const { error } = await getServiceClient()
    .from("users")
    .update({ name })
    .eq("email", authUser.email);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
