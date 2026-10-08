import Link from "next/link";
import { cn } from "@/lib/utils";

// Typeset stand-in for the IMAR wordmark (black letters, gold M) until the
// vector logo is supplied (Style.md §9). Swap the inner markup for the SVG then.
export function Wordmark({
  tone = "ink",
  className,
}: {
  tone?: "ink" | "white";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-display leading-none tracking-[0.42em] [font-variant-ligatures:none]",
        tone === "ink" ? "text-ink" : "text-white",
        className,
      )}
      aria-hidden
    >
      I<span className={tone === "ink" ? "text-gold" : undefined}>M</span>AR
    </span>
  );
}

export function LogoLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Imarhair home"
      className={cn("inline-flex min-h-11 items-center", className)}
    >
      {/* tracking adds trailing space after the last letter; pull it back */}
      <Wordmark className="-mr-[0.42em] text-[1.375rem] lg:text-[1.75rem]" />
    </Link>
  );
}
