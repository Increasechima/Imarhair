"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { AdminState } from "@/server/admin";
import { cn } from "@/lib/utils";
import { useSubmitAction } from "@/lib/use-submit-action";

const PendingContext = createContext<boolean | null>(null);

const idle: AdminState = { status: "idle" };

/**
 * Admin form wrapper: runs a server action with useActionState and shows its
 * result (success line or error summary). Inputs are passed as children.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  compact = false,
}: {
  action: (state: AdminState, formData: FormData) => Promise<AdminState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  compact?: boolean;
}) {
  const [state, onSubmit, pending] = useSubmitAction(action, idle);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.status === "ok") ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} onSubmit={onSubmit} className={className} noValidate aria-busy={pending}>
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      {state.status !== "idle" && (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={cn("text-small", compact ? "mt-1" : "mt-3", state.status === "error" ? "text-error" : "text-success")}
        >
          {state.message}
          {state.errors?.length ? (
            <ul className="mt-1 list-disc pl-5">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  name,
  value,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
  className?: string;
  name?: string;
  value?: string;
}) {
  const ctx = useContext(PendingContext);
  const status = useFormStatus();
  const pending = ctx ?? status.pending;
  return (
    <Button type="submit" variant={variant} loading={pending} className={className} name={name} value={value}>
      {children}
    </Button>
  );
}

/** Small inline button for plain (non-stateful) form actions: toggles, deletes. */
export function InlineSubmit({
  children,
  name,
  value,
  tone = "default",
  confirm,
}: {
  children: ReactNode;
  name?: string;
  value?: string;
  tone?: "default" | "danger";
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(
        "text-small inline-flex min-h-9 items-center underline underline-offset-4 disabled:opacity-50",
        tone === "danger" ? "text-error" : "text-ink",
      )}
    >
      {children}
    </button>
  );
}
