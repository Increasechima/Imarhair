"use client";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { sendContactMessage, type ContactState } from "@/server/actions/contact";
import { useSubmitAction } from "@/lib/use-submit-action";
import { cn } from "@/lib/utils";

const idle: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, onSubmit, pending] = useSubmitAction(sendContactMessage, idle);
  const e = state.fieldErrors ?? {};

  if (state.status === "ok") {
    return (
      <FormMessage tone="success">
        Thank you, we&rsquo;ve received your message. We usually reply within one working day.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {state.status === "error" && state.message && (
        <div className="sm:col-span-2">
          <FormMessage tone="error">{state.message}</FormMessage>
        </div>
      )}
      <Field label="Name" name="name" autoComplete="name" error={e.name} />
      <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" error={e.email} />
      <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" className="sm:col-span-2" />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="contact-message" className="text-small font-medium">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          aria-invalid={e.message ? true : undefined}
          aria-describedby={e.message ? "contact-message-error" : undefined}
          className={cn(
            "w-full rounded-sm border border-line bg-white px-4 py-3 text-base focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none",
            e.message && "border-error",
          )}
        />
        {e.message && (
          <p id="contact-message-error" className="text-small text-error">
            {e.message}
          </p>
        )}
      </div>
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden className="sr-only">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Send message
        </Button>
      </div>
    </form>
  );
}
