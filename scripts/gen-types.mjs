// pnpm db:types:remote: regenerate src/lib/supabase/database.types.ts from the
// hosted project in SUPABASE_DB_URL (no Docker needed).
import { existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL is not set (see .env.example).");
  process.exit(2);
}

// Run the CLI's JS entry with this Node binary — no shell — so the connection
// string (which contains the DB password) is never interpolated into a command.
const cli = createRequire(import.meta.url).resolve("supabase/dist/supabase.js");
const out = execFileSync(
  process.execPath,
  [cli, "gen", "types", "typescript", "--db-url", process.env.SUPABASE_DB_URL, "--schema", "public"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
writeFileSync("src/lib/supabase/database.types.ts", out);
console.log("Wrote src/lib/supabase/database.types.ts");
