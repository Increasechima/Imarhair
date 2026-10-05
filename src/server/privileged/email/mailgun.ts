import "server-only";
import { serverEnv } from "@/server/env";

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

/** Sends through Mailgun's HTTP API, or prints to the server log in dev (EMAIL_TRANSPORT=log). */
export async function deliverEmail(email: OutgoingEmail): Promise<{ id: string | null }> {
  if (serverEnv.emailTransport === "log") {
    console.info(`\n[email:log] to=${email.to} subject="${email.subject}"\n${email.text}\n`);
    return { id: `log-${Date.now()}` };
  }

  const { apiKey, domain, apiBase } = serverEnv.mailgun;
  const body = new URLSearchParams({
    from: serverEnv.emailFrom,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  const res = await fetch(`${apiBase}/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: json.id ?? null };
}
