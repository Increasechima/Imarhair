"use client";

import { useActionState, useId } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/server/actions/newsletter";
import { cn } from "@/lib/utils";

const initialState: NewsletterState = { status: "idle" };

export function NewsletterForm({
  className,
  source = "footer",
  submitLabel = "Join",
  successMessage = "You’re on the list. Welcome, Queen.",
}: {
  className?: string;
  source?: "footer" | "coming_soon_haircare";
  submitLabel?: string;
  successMessage?: string;
}) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initialState);
  const id = useId();
  const inputId = source === "footer" ? "newsletter-email" : `newsletter-${id}`;
  const errorId = `${inputId}-error`;

  if (state.status === "success") {
    return (
      <p role="status" className={cn("text-body text-success", className)}>
        {successMessage}
      </p>
    );
  }

  return (
    <form action={action} className={className} noValidate>
      <input type="hidden" name="source" value={source} />
      <div className="flex border-b border-ink">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Your email"
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={state.status === "error" ? errorId : undefined}
          className="h-12 min-w-0 flex-1 bg-transparent text-base placeholder:text-taupe focus:outline-none"
        />
        <button type="submit" disabled={pending} className="text-label min-h-11 px-2 disabled:text-stone">
          {pending ? "Joining…" : submitLabel}
        </button>
      </div>
      {state.status === "error" && (
        <p id={errorId} className="text-small mt-2 text-error" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
