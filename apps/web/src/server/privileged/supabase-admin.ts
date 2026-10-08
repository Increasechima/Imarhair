import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";
import type { Database } from "@imarhair/shared/database.types";

/**
 * Service-role client: BYPASSES RLS. Only for privileged server code
 * (orders, payments, webhooks, email log). Always check ownership yourself
 * before returning data to a visitor.
 */
export function supabaseAdmin() {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
