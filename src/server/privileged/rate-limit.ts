import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";

export const LIMITS = {
  newsletter: { max: 5, windowSeconds: 3600 },
  contact: { max: 5, windowSeconds: 3600 },
  placeOrder: { max: 10, windowSeconds: 600 },
} as const;

async function clientIp(): Promise<string> {
  const h = await headers();
  // Vercel/most proxies put the client first in x-forwarded-for.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * true = allowed. Keys are sha256(bucket + IP) so no IPs are stored (NDPA).
 * Fails OPEN: if the limiter itself errors, real customers are never blocked.
 */
export async function rateLimit(bucket: keyof typeof LIMITS, extra = ""): Promise<boolean> {
  const { max, windowSeconds } = LIMITS[bucket];
  const key = createHash("sha256").update(`${bucket}|${await clientIp()}|${extra}`).digest("hex");
  try {
    const { data, error } = await supabaseAdmin().rpc("check_rate_limit", {
      p_key: `${bucket}:${key}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data !== false;
  } catch (e) {
    console.error("rate limiter unavailable (allowing request)", (e as Error).message);
    return true;
  }
}
