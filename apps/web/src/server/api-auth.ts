import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@imarhair/shared/database.types";
import type { SessionUser } from "@/lib/supabase/server";

// Auth for /api/v1 (the mobile app). The app signs in with Supabase Auth and
// sends its access token as `Authorization: Bearer <jwt>`. We verify the JWT,
// then build an anon-key client that acts AS that user, so RLS applies exactly
// as it does for the website's cookie session. No cookies, so no CSRF surface.

export type ApiAuth = { user: SessionUser; db: SupabaseClient<Database> };

export async function apiAuth(request: NextRequest): Promise<ApiAuth | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer (\S+)$/i.exec(header)?.[1];
  if (!token) return null;

  const db = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  const { data, error } = await db.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { user: { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null }, db };
}

const NO_STORE = { "Cache-Control": "private, no-store" };

export function json<T>(body: T, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** Result → HTTP: ok → 200, otherwise 400 with the customer-safe message. */
export function resultJson<T>(result: { ok: true; data: T } | { ok: false; error: string }) {
  return json(result, result.ok ? 200 : 400);
}

export const unauthorized = () => json({ ok: false, error: "Please sign in again." }, 401);

/** Parses a JSON body; malformed or missing bodies become `undefined` (Zod then rejects them). */
export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
