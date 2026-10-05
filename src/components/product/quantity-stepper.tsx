"use client";

import { Minus, Plus } from "lucide-react";

// Style.md §6 Quantity stepper: three 44px cells.
export function QuantityStepper({
  value,
  max,
  onChange,
  label = "Quantity",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  const cell = "inline-flex size-11 items-center justify-center disabled:text-stone";
  return (
    <div className="inline-flex items-center border border-line bg-white" role="group" aria-label={label}>
      <button type="button" className={cell} aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" strokeWidth={1.5} />
      </button>
      <output className="text-body w-11 text-center tabular-nums" aria-live="polite">
        {value}
      </output>
      <button type="button" className={cell} aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
