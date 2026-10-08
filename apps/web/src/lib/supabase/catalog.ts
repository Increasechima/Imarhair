import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@imarhair/shared/database.types";

/** Tag on every catalogue read; admin saves call revalidateTag(CATALOG_TAG, "max"). */
export const CATALOG_TAG = "catalog";
/** Seconds a catalogue read may be served from cache. */
export const CATALOG_REVALIDATE = 300;

/**
 * Anonymous, cookie-less client for public catalogue reads (Architecture.md §4).
 * Because it never touches the visitor's session, product pages can be
 * prerendered and served from cache; RLS still limits it to published data.
 */
export function catalogClient() {
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: CATALOG_REVALIDATE, tags: [CATALOG_TAG] } }),
    },
  });
}
