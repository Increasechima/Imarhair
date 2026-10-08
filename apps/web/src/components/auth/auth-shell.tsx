import type { ReactNode } from "react";

// Single centred column for every auth screen (prd.md §6.9).
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="container-page flex flex-1 justify-center py-12 lg:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-h1 text-center">{title}</h1>
        {subtitle && <p className="text-body mt-3 text-center text-taupe">{subtitle}</p>}
        <div className="mt-10">{children}</div>
        {footer && <div className="text-small mt-10 border-t border-line pt-6 text-center text-taupe">{footer}</div>}
      </div>
    </section>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="text-label text-stone">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
