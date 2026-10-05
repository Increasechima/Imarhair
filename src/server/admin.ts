import "server-only";
import { updateTag } from "next/cache";
import { getProfile } from "@/lib/supabase/server";
import { CATALOG_TAG } from "@/lib/supabase/catalog";

/**
 * Every admin server action starts with this. The admin layout already hides
 * pages from non-admins, but actions are callable directly, so they re-check.
 * RLS / the SQL admin functions enforce the same rule a third time.
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

export type AdminState = { status: "idle" | "ok" | "error"; message?: string; errors?: string[] };
export const NOT_ALLOWED: AdminState = { status: "error", message: "You don't have permission to do that." };

/** Storefront shows catalogue changes on the next request (read-your-writes). */
export function refreshStorefront() {
  updateTag(CATALOG_TAG);
}
