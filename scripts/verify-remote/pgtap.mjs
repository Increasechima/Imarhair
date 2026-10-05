// Runs every supabase/tests/*.test.sql file against the hosted DB and parses
// the TAP output. `supabase test db` needs Docker (pg_prove); this does not.
// Each test file wraps itself in begin … rollback, so nothing persists.
import { readdirSync, readFileSync } from "node:fs";

export async function verifyPgTap(db, r) {
  const files = readdirSync("supabase/tests").filter((f) => f.endsWith(".test.sql")).sort();
  for (const file of files) {
    r.section(`pgTAP: supabase/tests/${file}`);
    const lines = [];
    try {
      const res = await db.query(readFileSync(`supabase/tests/${file}`, "utf8"));
      for (const result of [].concat(res)) {
        for (const row of result.rows ?? []) {
          for (const v of Object.values(row)) {
            if (typeof v === "string" && /^\s*(ok|not ok|1\.\.|#)/.test(v)) lines.push(...v.split("\n"));
          }
        }
      }
    } catch (e) {
      await db.query("rollback").catch(() => {});
      r.check(false, `${file} ran to completion`, `${e.code ?? ""} ${e.message}`);
      continue;
    }
    const plan = lines.find((l) => /^1\.\.\d+/.test(l));
    const planned = plan ? Number(plan.split("..")[1]) : NaN;
    let ran = 0;
    for (const line of lines) {
      const m = line.match(/^(not ok|ok) \d+ - (.*)$/);
      if (m) {
        ran++;
        r.check(m[1] === "ok", m[2]);
      } else if (line.startsWith("#") && !/^# Looks like/.test(line)) {
        console.log(`    ${line}`);
      }
    }
    r.check(ran === planned, `${file}: ran all ${planned} planned tests`, `${ran}`);
  }
}
