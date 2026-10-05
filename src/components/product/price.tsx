import { cn } from "@/lib/utils";

export function Price({
  label,
  compareAt,
  size = "md",
  className,
}: {
  label: string;
  compareAt?: string | null;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 tabular-nums",
        size === "lg" ? "text-h3" : "text-price",
        className,
      )}
    >
      <span>{label}</span>
      {compareAt && (
        <s className={cn("text-stone", size === "lg" ? "text-body" : "text-small")}>
          <span className="sr-only">Was </span>
          {compareAt}
        </s>
      )}
    </p>
  );
}
