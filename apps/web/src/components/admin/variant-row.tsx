import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { adminInput } from "@/components/admin/admin-ui";
import { saveVariant } from "@/server/actions/admin/products";

export type AdminVariant = {
  id: string;
  sku: string;
  length_inches: number | null;
  density: string | null;
  colour: string | null;
  lace_type: string | null;
  price: number;
  compare_at_price: number | null;
  is_default: boolean;
  is_active: boolean;
  on_hand: number;
  reserved: number;
};

const naira = (kobo: number | null) => (kobo == null ? "" : String(kobo / 100));

/** One editable variant (or a blank one for "Add variant"). */
export function VariantForm({ productId, variant }: { productId: string; variant?: AdminVariant }) {
  const cell = "flex flex-col gap-1";
  const label = "text-small text-taupe";
  return (
    <ActionForm action={saveVariant} resetOnSuccess={!variant} className="border border-line bg-white p-4">
      <input type="hidden" name="productId" value={productId} />
      {variant && <input type="hidden" name="variantId" value={variant.id} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <label className={`${cell} col-span-2`}>
          <span className={label}>SKU</span>
          <input name="sku" defaultValue={variant?.sku} required className={adminInput} placeholder="IMR-PR-BNC16-300" />
        </label>
        <label className={cell}>
          <span className={label}>Length (&quot;)</span>
          <input name="lengthInches" inputMode="numeric" defaultValue={variant?.length_inches ?? ""} className={adminInput} />
        </label>
        <label className={cell}>
          <span className={label}>Density</span>
          <input name="density" defaultValue={variant?.density ?? ""} className={adminInput} placeholder="300g" />
        </label>
        <label className={`${cell} col-span-2`}>
          <span className={label}>Colour</span>
          <input name="colour" defaultValue={variant?.colour ?? ""} className={adminInput} placeholder="Natural Black" />
        </label>
        <label className={`${cell} col-span-2`}>
          <span className={label}>Lace / closure</span>
          <input name="laceType" defaultValue={variant?.lace_type ?? ""} className={adminInput} placeholder="5x5 Swiss Lace" />
        </label>
        <label className={cell}>
          <span className={label}>Price (₦)</span>
          <input name="price" inputMode="decimal" defaultValue={naira(variant?.price ?? null)} required className={adminInput} />
        </label>
        <label className={cell}>
          <span className={label}>Was (₦)</span>
          <input name="compareAtPrice" inputMode="decimal" defaultValue={naira(variant?.compare_at_price ?? null)} className={adminInput} placeholder="optional" />
        </label>
        <label className={cell}>
          <span className={label}>In stock</span>
          <input name="stock" type="number" min={variant?.reserved ?? 0} defaultValue={variant?.on_hand ?? 0} className={adminInput} />
        </label>
        <div className="col-span-2 flex flex-col justify-end gap-1 pb-1 sm:col-span-3">
          <label className="text-small flex items-center gap-2">
            <input type="checkbox" name="isDefault" defaultChecked={variant?.is_default ?? false} className="size-4 accent-ink" />
            Default option
          </label>
          <label className="text-small flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={variant?.is_active ?? true} className="size-4 accent-ink" />
            Active (for sale)
          </label>
        </div>
        <div className="col-span-2 flex items-end sm:col-span-1 lg:col-span-1">
          <SubmitButton variant={variant ? "secondary" : "primary"} className="h-10 w-full px-3 lg:h-10">
            {variant ? "Save" : "Add"}
          </SubmitButton>
        </div>
      </div>
      {variant && variant.reserved > 0 && (
        <p className="text-small mt-2 text-taupe">{variant.reserved} held by checkouts in progress.</p>
      )}
    </ActionForm>
  );
}
