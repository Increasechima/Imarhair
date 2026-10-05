// Shared helpers for `pnpm verify:remote` and `pnpm verify:e2e`.
// These scripts CREATE AND DELETE test users and rows on a hosted Supabase
// project, so they refuse to run unless VERIFY_REMOTE_PROJECT_REF names it.
import { existsSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "VERIFY_REMOTE_PROJECT_REF",
];

export function loadConfig() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}. See README.md → "Verifying a hosted project".`);
    process.exit(2);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = new URL(url).hostname.split(".")[0];
  if (ref !== process.env.VERIFY_REMOTE_PROJECT_REF) {
    console.error(`Refusing to run: ${ref} is not VERIFY_REMOTE_PROJECT_REF (${process.env.VERIFY_REMOTE_PROJECT_REF}).`);
    process.exit(2);
  }
  if (!process.env.SUPABASE_DB_URL.includes(ref)) {
    console.error("Refusing to run: SUPABASE_DB_URL points at a different project than NEXT_PUBLIC_SUPABASE_URL.");
    process.exit(2);
  }
  return {
    url,
    ref,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    dbUrl: process.env.SUPABASE_DB_URL,
  };
}

export async function connectDb(cfg) {
  const client = new pg.Client({ connectionString: cfg.dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };
export const anonClient = (cfg) => createClient(cfg.url, cfg.anonKey, noPersist);
export const serviceClient = (cfg) => createClient(cfg.url, cfg.serviceKey, noPersist);

// Every test identity uses this prefix so aborted runs can be swept up.
export const TEST_PREFIX = "imar-verify-";
export const runId = () => Date.now().toString(36);

export function createReporter() {
  const state = { passed: 0, failed: 0, skipped: 0 };
  return {
    state,
    section: (title) => console.log(`\n${title}`),
    check(cond, message, detail = "") {
      if (cond) state.passed++;
      else state.failed++;
      console.log(`${cond ? "  ✓" : "  ✗"} ${message}${detail !== "" ? ` (${detail})` : ""}`);
      return cond;
    },
    skip(message, why) {
      state.skipped++;
      console.log(`  - ${message} (skipped: ${why})`);
    },
  };
}

/** Delete test users/rows left behind by any earlier, aborted run. */
export async function sweepTestData(cfg, db) {
  const admin = serviceClient(cfg);
  let removed = 0;
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.startsWith(TEST_PREFIX)) {
        await admin.auth.admin.deleteUser(u.id);
        removed++;
      }
    }
    if (data.users.length < 200) break;
  }
  await db.query(`delete from public.orders where email::text like '${TEST_PREFIX}%' or order_number like 'IMR-19990101-%'`);
  await db.query(`delete from public.newsletter_subscribers where email::text like '${TEST_PREFIX}%'`);
  await db.query(`delete from public.email_log where to_email::text like '${TEST_PREFIX}%'`);
  return removed;
}
