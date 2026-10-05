"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { rateLimit } from "@/server/privileged/rate-limit";
import { deliverEmail } from "@/server/privileged/email/mailgun";
import { serverEnv } from "@/server/env";

export type ContactState = { status: "idle" | "ok" | "error"; message?: string; fieldErrors?: FieldErrors };

const contactSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }).max(120),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => v || null),
  message: z.string().trim().min(5, { error: "Tell us a little more." }).max(4000),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Contact form: stored in Supabase, forwarded to support (prd.md §6.19). */
export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // A filled honeypot is a bot: pretend it worked.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { status: "ok" };
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  if (!(await rateLimit("contact"))) {
    return { status: "error", message: "You've sent a few messages already. Please try again later, or reach us on Instagram." };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({ name: d.name, email: d.email, phone: d.phone, message: d.message });
  if (error) {
    console.error("contact insert failed", { code: error.code });
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const to = serverEnv.supportEmail;
  if (to) {
    await deliverEmail({
      to,
      replyTo: d.email,
      subject: `New message from ${d.name}`,
      text: `${d.message}\n\n— ${d.name}\n${d.email}${d.phone ? `\n${d.phone}` : ""}`,
      html: `<p style="font-family:Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(d.message)}</p><p style="font-family:Helvetica,Arial,sans-serif">— ${esc(d.name)}<br>${esc(d.email)}${d.phone ? `<br>${esc(d.phone)}` : ""}</p>`,
    }).catch((e) => console.error("contact email failed", (e as Error).message));
  }
  return { status: "ok" };
}
