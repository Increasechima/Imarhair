// Supabase Realtime stores broadcasts in daily partitions of realtime.messages,
// which the Realtime service creates only while the project has Realtime
// connections. An idle dev project has none, so cart pings (realtime.send)
// are dropped with a warning and the cart_realtime pgTAP test can't observe
// them. Opening one connection makes Realtime create today's partitions.
import { anonClient } from "./lib.mjs";

const hasTodayPartition = async (db) =>
  (await db.query(`select count(*)::int n from pg_inherits i join pg_class c on c.oid = i.inhrelid
     where i.inhparent = 'realtime.messages'::regclass
       and c.relname = 'messages_' || to_char(now() at time zone 'utc', 'YYYY_MM_DD')`)).rows[0].n > 0;

export async function wakeRealtime(cfg, db, r) {
  r.section("Realtime");
  if (await hasTodayPartition(db)) {
    r.check(true, "realtime.messages has today's partition", "already present");
    return;
  }
  const sb = anonClient(cfg);
  const status = await new Promise((resolve) => {
    sb.channel(`imar-verify-wake-${Date.now()}`).subscribe((s) => s !== "CLOSED" && resolve(s));
    setTimeout(() => resolve("timeout"), 15000);
  });
  let ok = false;
  for (let i = 0; i < 15 && !ok; i++) {
    await new Promise((res) => setTimeout(res, 2000));
    ok = await hasTodayPartition(db);
  }
  await sb.removeAllChannels();
  r.check(ok, "realtime.messages has today's partition", ok ? "created after connecting" : `subscribe: ${status}`);
}
