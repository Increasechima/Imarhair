"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastAction = { label: string; href?: string; onClick?: () => void; primary?: boolean };
export type ToastInput = {
  title: string;
  description?: string;
  media?: ReactNode;
  actions?: ToastAction[];
  tone?: "default" | "error";
};

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

// One toast at a time (Style.md §6 Toast): bottom-centre on mobile,
// bottom-right on desktop, 4s auto-dismiss, never blocks shopping.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => setToast(null), []);
  const show = useCallback((input: ToastInput) => {
    setToast({ ...input, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(dismiss, 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, dismiss]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex justify-center p-4 lg:justify-end lg:p-6"
      >
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            onMouseEnter={() => timer.current && clearTimeout(timer.current)}
            onMouseLeave={() => (timer.current = setTimeout(dismiss, 2000))}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-4 border border-line bg-white p-4 shadow-(--shadow-overlay)",
              "motion-safe:animate-[rise-in_250ms_var(--ease-out)_both]",
            )}
          >
            {toast.media && <div className="w-14 shrink-0">{toast.media}</div>}
            <div className="min-w-0 flex-1">
              <p className={cn("text-body font-medium", toast.tone === "error" && "text-error")}>{toast.title}</p>
              {toast.description && <p className="text-small mt-0.5 truncate text-taupe">{toast.description}</p>}
              {toast.actions?.length ? (
                <div className="mt-2 flex flex-wrap gap-x-5">
                  {toast.actions.map((a) =>
                    a.href ? (
                      <Link
                        key={a.label}
                        href={a.href}
                        onClick={dismiss}
                        className="text-label inline-flex min-h-11 items-center underline decoration-1 underline-offset-4"
                      >
                        {a.label}
                      </Link>
                    ) : (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => {
                          a.onClick?.();
                          dismiss();
                        }}
                        className={cn(
                          "text-label inline-flex min-h-11 items-center",
                          a.primary ? "underline decoration-1 underline-offset-4" : "text-taupe",
                        )}
                      >
                        {a.label}
                      </button>
                    ),
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="-m-2 inline-flex size-11 shrink-0 items-center justify-center text-taupe"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
