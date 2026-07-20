import { createServerSupabase } from "@/lib/supabase-ssr";
import { getServiceClient } from "@/lib/supabase-server";
import type { User } from "@/lib/types";

/** The Supabase-authenticated user (Google identity), or null. */
export async function getAuthUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export function isAdminEmail(email?: string | null): boolean {
  const admin = adminEmail();
  return Boolean(admin) && Boolean(email) && email!.toLowerCase() === admin;
}

/** Resolve the app `users` profile row for the current session (by email). */
export async function getCurrentUser(): Promise<User | null> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return null;
  const { data } = await getServiceClient()
    .from("users")
    .select("*")
    .eq("email", authUser.email)
    .maybeSingle();
  return (data as User) ?? null;
}

/** The current app user's id, or throw (callers map the throw to 401). */
export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/** Throw unless the current session is the configured admin. */
export async function requireAdmin() {
  const authUser = await getAuthUser();
  if (!isAdminEmail(authUser?.email)) {
    throw new Error("Admin access required.");
  }
  return authUser;
}
