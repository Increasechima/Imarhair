"use server";

import { createClient } from "@/lib/supabase/server";
import { newsletterSchema } from "@imarhair/shared/validation/auth";
import { rateLimit } from "@/server/privileged/rate-limit";

export type NewsletterState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (!(await rateLimit("newsletter"))) {
    return { status: "error", message: "Too many attempts. Please try again in a little while." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").insert(parsed.data);

  // 23505 = already subscribed. Treat as success; don't reveal who is on the list.
  if (error && error.code !== "23505") {
    console.error("newsletter.subscribe failed", { code: error.code });
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  return { status: "success" };
}
