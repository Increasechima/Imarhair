// pnpm verify:remote — schema + pgTAP + live API checks against the hosted
// Supabase project named by VERIFY_REMOTE_PROJECT_REF. See README.md.
import { connectDb, createReporter, loadConfig, runId, sweepTestData } from "./lib.mjs";
import { verifySchema } from "./schema.mjs";
import { verifyPgTap } from "./pgtap.mjs";
import { verifyApi } from "./api.mjs";

const cfg = loadConfig();
const r = createReporter();
const db = await connectDb(cfg);
console.log(`Verifying Supabase project ${cfg.ref}`);

try {
  const swept = await sweepTestData(cfg, db);
  if (swept) console.log(`Removed ${swept} test user(s) left by an earlier run.`);
  await verifySchema(db, r);
  await verifyPgTap(db, r);
  await verifyApi(cfg, db, r, runId());
} catch (e) {
  r.check(false, "verification aborted", e.message);
} finally {
  const left = (await db.query(`select
      (select count(*) from auth.users where email like 'imar-verify-%')::int test_users,
      (select count(*) from public.newsletter_subscribers where email::text like 'imar-verify-%')::int test_subscribers,
      (select count(*) from public.orders where order_number like 'IMR-19990101-%')::int test_orders`)).rows[0];
  r.check(left.test_users + left.test_subscribers + left.test_orders === 0, "no test data left behind", JSON.stringify(left));
  await db.end();
  const { passed, failed, skipped } = r.state;
  console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}`);
  process.exit(failed ? 1 : 0);
}
