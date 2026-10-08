import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "on-image" | "text";
type Size = "md" | "lg";

// Style.md §6 Buttons. Ink is primary — never gold.
export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: { variant?: Variant; size?: Size; fullWidth?: boolean } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 text-label select-none",
    "transition-colors duration-(--duration-fast) ease-(--ease-out)",
    "disabled:pointer-events-none aria-disabled:pointer-events-none",
    variant !== "text" && "rounded-sm px-6",
    variant !== "text" && (size === "lg" ? "h-13" : "h-13 lg:h-12"),
    variant === "primary" &&
      "bg-ink text-white hover:bg-ink-soft disabled:bg-sand disabled:text-stone",
    variant === "secondary" &&
      "border border-ink text-ink hover:bg-ink hover:text-white disabled:border-line disabled:text-stone",
    variant === "on-image" && "bg-white text-ink hover:bg-ivory",
    variant === "text" &&
      "min-h-11 underline decoration-1 underline-offset-4 hover:decoration-gold disabled:text-stone",
    fullWidth && "w-full",
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
};

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size, fullWidth }), "relative", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Keep the label in the layout while loading so the button doesn't change width. */}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="size-4 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
        </span>
      )}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonStyles({ variant, size, fullWidth }), className)} {...props} />;
}
