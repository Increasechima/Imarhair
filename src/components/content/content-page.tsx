import type { ReactNode } from "react";

// Layout for About / FAQ / policies: a 720px reading column (Style.md §3).
export function ContentPage({
  eyebrow,
  title,
  intro,
  updated,
  draft = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  updated?: string;
  /** Wording not yet approved by Imarhair: flagged in development only. */
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="container-page py-10 lg:py-16">
      <div className="mx-auto max-w-(--container-prose)">
        {draft && process.env.NODE_ENV !== "production" && (
          <p role="note" className="text-small mb-8 border-l-2 border-warning bg-white px-4 py-3 text-warning">
            Draft wording for development. Imarhair must review and approve this page before launch (prd.md §6.19).
          </p>
        )}
        {eyebrow && <p className="text-label text-taupe">{eyebrow}</p>}
        <h1 className="text-h1 mt-2">{title}</h1>
        {intro && <div className="text-body-lg mt-4 text-taupe">{intro}</div>}
        {updated && <p className="text-small mt-3 text-stone">Last updated {updated}</p>}
        <div className="prose-imar mt-10">{children}</div>
      </div>
    </article>
  );
}
