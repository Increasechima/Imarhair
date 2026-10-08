import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const inputBase = cn(
  "h-13 w-full rounded-sm border border-line bg-white px-4 text-base text-ink",
  "placeholder:text-stone",
  "transition-colors duration-(--duration-fast)",
  "focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none",
  "aria-invalid:border-error aria-invalid:focus:ring-error",
  "disabled:bg-beige disabled:text-stone",
);

type FieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

// Style.md §6 Inputs: label above, 16px text (no iOS zoom), error below.
export function Field({ label, error, hint, id, className, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-small font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        className={inputBase}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && hintId) || undefined}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-small text-taupe">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-small text-error" aria-live="polite">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "border-l-2 px-4 py-3 text-small",
        tone === "error" ? "border-error bg-white text-error" : "border-success bg-white text-success",
      )}
    >
      {children}
    </div>
  );
}

type SelectFieldProps = ComponentProps<"select"> & {
  label: string;
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

// Native <select> so phones show their own picker (Style.md §6 Inputs).
export function SelectField({ label, error, options, placeholder, id, className, ...props }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={selectId} className="text-small font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        className={inputBase}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-small text-error" aria-live="polite">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
