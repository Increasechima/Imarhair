import "server-only";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";

/**
 * Origin for payment callback URLs. The live site always uses the configured
 * NEXT_PUBLIC_SITE_URL; local development may use the actual localhost origin
 * (e.g. another port). Other request origins are never trusted.
 */
export async function callbackOrigin(): Promise<string> {
  if (serverEnv.isLiveDeployment) return publicEnv.siteUrl;
  const origin = (await headers()).get("origin");
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/.test(origin)) return origin;
  return publicEnv.siteUrl;
}
