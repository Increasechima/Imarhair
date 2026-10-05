import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Functional, not elaborate (prd.md §6.18): hairline tables, compact type.

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-h2">{title}</h1>
        {description && <p className="text-small mt-1 text-taupe">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto border border-line", className)}>
      <table className="text-small w-full border-collapse text-left [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_th]:bg-ivory [&_th]:px-3 [&_th]:py-2.5 [&_th]:font-medium [&_th]:whitespace-nowrap [&_th]:text-taupe">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-small border border-dashed border-line px-4 py-10 text-center text-taupe">{children}</p>;
}

export function Pager({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="text-small mt-4 flex items-center justify-between">
      <span className="text-taupe">
        Page {page} of {pages} · {total} total
      </span>
      <span className="flex gap-4">
        {page > 1 && (
          <Link href={href(page - 1)} className="underline underline-offset-4">
            Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="underline underline-offset-4">
            Next
          </Link>
        )}
      </span>
    </nav>
  );
}

/** Admin inputs: compact versions of the storefront fields. */
export const adminInput =
  "h-10 w-full rounded-sm border border-line bg-white px-3 text-small text-ink focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none";

export function Labelled({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-small font-medium">{label}</span>
      {children}
      {hint && <span className="text-small text-taupe">{hint}</span>}
    </label>
  );
}
