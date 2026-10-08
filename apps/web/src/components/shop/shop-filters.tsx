"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activeFilterCount,
  PRICE_BANDS,
  shopQueryString,
  SORTS,
  type ShopParams,
  type SortKey,
} from "@imarhair/shared/catalog/shop-params";
import type { Facets } from "@/server/queries/catalog";
import { cn } from "@/lib/utils";

type Props = {
  facets: Facets;
  params: ShopParams;
  basePath: string;
  lockCollection?: boolean;
};

function useApply(basePath: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = (next: ShopParams) =>
    startTransition(() => router.push(`${basePath}${shopQueryString({ ...next, page: 1 })}`, { scroll: false }));
  return { apply, pending };
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Desktop sidebar: every change applies immediately. */
export function FilterSidebar(props: Props) {
  const { apply, pending } = useApply(props.basePath);
  return (
    <aside aria-label="Filters" className={cn("hidden lg:block", pending && "opacity-60")} aria-busy={pending}>
      <FilterFields {...props} value={props.params} onChange={apply} />
    </aside>
  );
}

/** Mobile: a Filter button opening a full-height sheet with "Show results". */
export function FilterSheetButton(props: Props) {
  const { apply } = useApply(props.basePath);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(props.params);
  const count = activeFilterCount(props.params, { lockCollection: props.lockCollection });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(props.params);
        setOpen(o);
      }}
    >
      <Dialog.Trigger className="text-label inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 lg:hidden">
        <SlidersHorizontal className="size-4" strokeWidth={1.5} />
        Filter{count > 0 && ` (${count})`}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-ivory data-[state=open]:animate-[rise-in_350ms_var(--ease-out)]">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Dialog.Title className="text-label">Filter</Dialog.Title>
            <Dialog.Description className="sr-only">Narrow down the products shown</Dialog.Description>
            <Dialog.Close aria-label="Close filters" className="-mr-2.5 inline-flex size-11 items-center justify-center">
              <X className="size-6" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <FilterFields {...props} value={draft} onChange={setDraft} />
          </div>
          <div className="flex gap-3 border-t border-line bg-ivory p-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setDraft({ ...draft, categories: [], collections: props.lockCollection ? draft.collections : [], lengths: [], price: null, inStock: false })}
            >
              Clear all
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                apply(draft);
                setOpen(false);
              }}
            >
              Show results
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FilterFields({
  facets,
  value,
  onChange,
  lockCollection,
}: Props & { value: ShopParams; onChange: (next: ShopParams) => void }) {
  const section = "border-b border-line pb-6 mb-6 last:border-b-0";
  const legend = "text-label mb-3";
  const checkRow = "text-body flex min-h-11 cursor-pointer items-center gap-3";

  return (
    <div>
      {facets.categories.length > 1 && (
        <fieldset className={section}>
          <legend className={legend}>Category</legend>
          {facets.categories.map((c) => (
            <label key={c.slug} className={checkRow}>
              <input
                type="checkbox"
                className="size-5 accent-ink"
                checked={value.categories.includes(c.slug)}
                onChange={() => onChange({ ...value, categories: toggle(value.categories, c.slug) })}
              />
              {c.name}
            </label>
          ))}
        </fieldset>
      )}

      {!lockCollection && facets.collections.length > 1 && (
        <fieldset className={section}>
          <legend className={legend}>Collection</legend>
          {facets.collections.map((c) => (
            <label key={c.slug} className={checkRow}>
              <input
                type="checkbox"
                className="size-5 accent-ink"
                checked={value.collections.includes(c.slug)}
                onChange={() => onChange({ ...value, collections: toggle(value.collections, c.slug) })}
              />
              {c.name}
            </label>
          ))}
        </fieldset>
      )}

      {facets.lengths.length > 1 && (
        <fieldset className={section}>
          <legend className={legend}>Length</legend>
          <div className="flex flex-wrap gap-2">
            {facets.lengths.map((len) => {
              const on = value.lengths.includes(len);
              return (
                <button
                  key={len}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, lengths: toggle(value.lengths, len).sort((a, b) => a - b) })}
                  className={cn(
                    "text-small h-11 min-w-14 rounded-sm border px-3",
                    on ? "border-ink ring-[0.5px] ring-ink" : "border-line bg-white hover:border-taupe",
                  )}
                >
                  {len}&quot;
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset className={section}>
        <legend className={legend}>Price</legend>
        {[{ value: null, label: "Any price" }, ...PRICE_BANDS].map((band) => (
          <label key={band.value ?? "any"} className={checkRow}>
            <input
              type="radio"
              name="price"
              className="size-5 accent-ink"
              checked={value.price === band.value}
              onChange={() => onChange({ ...value, price: band.value })}
            />
            {band.label}
          </label>
        ))}
      </fieldset>

      <fieldset className={section}>
        <legend className={legend}>Availability</legend>
        <label className={checkRow}>
          <input
            type="checkbox"
            className="size-5 accent-ink"
            checked={value.inStock}
            onChange={() => onChange({ ...value, inStock: !value.inStock })}
          />
          In stock only
        </label>
      </fieldset>
    </div>
  );
}

export function SortSelect({ params, basePath }: { params: ShopParams; basePath: string }) {
  const { apply, pending } = useApply(basePath);
  return (
    <label className="text-small inline-flex shrink-0 items-center gap-2">
      <span className="sr-only text-taupe lg:not-sr-only">Sort</span>
      <select
        value={params.sort}
        aria-busy={pending}
        onChange={(e) => apply({ ...params, sort: e.target.value as SortKey })}
        className="h-11 max-w-40 rounded-sm border border-line bg-white pr-8 pl-3 text-base text-ink lg:max-w-none lg:text-small"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {params.q && s.value === "featured" ? "Most relevant" : s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
