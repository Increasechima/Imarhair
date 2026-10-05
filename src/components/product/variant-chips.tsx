"use client";

import { valueState, type OptionGroup, type OptionKey, type OptionValue, type Selection } from "@/lib/catalog/variants";
import type { VariantOption } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

// Style.md §6 Variant chips: 44px, hairline border; selected = ink border;
// sold out = struck through and not selectable.
export function VariantChips({
  groups,
  variants,
  selection,
  onChoose,
  idPrefix,
}: {
  groups: OptionGroup[];
  variants: VariantOption[];
  selection: Selection;
  onChoose: (key: OptionKey, value: OptionValue) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const selected = group.values.find((v) => v.value === selection[group.key]);
        const labelId = `${idPrefix}-${group.key}`;
        return (
          <fieldset key={group.key}>
            <legend id={labelId} className="text-label mb-3 flex gap-2">
              {group.label}
              {selected && <span className="normal-case tracking-normal text-taupe">{selected.label}</span>}
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={labelId}>
              {group.values.map((v) => {
                const state = valueState(variants, selection, group.key, v.value);
                const soldOut = state === "sold-out";
                return (
                  <button
                    key={String(v.value)}
                    type="button"
                    role="radio"
                    aria-checked={state === "selected"}
                    aria-disabled={soldOut || undefined}
                    disabled={soldOut}
                    onClick={() => onChoose(group.key, v.value)}
                    className={cn(
                      "text-small h-11 min-w-14 rounded-sm border px-3 transition-colors duration-(--duration-fast)",
                      state === "selected"
                        ? "border-ink text-ink ring-[0.5px] ring-ink"
                        : "border-line bg-white text-ink hover:border-taupe",
                      soldOut && "cursor-not-allowed bg-transparent text-stone line-through",
                    )}
                  >
                    {v.label}
                    {soldOut && <span className="sr-only"> (sold out)</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
