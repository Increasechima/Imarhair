import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { adminInput, Labelled } from "@/components/admin/admin-ui";
import { saveProduct } from "@/server/actions/admin/products";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  care: string | null;
  details: Record<string, string>;
  category_id: string;
  collection_id: string | null;
  position: number;
  is_published: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
};

export function ProductForm({
  product,
  categories,
  collections,
}: {
  product?: ProductFormValues;
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
}) {
  const details = product ? Object.entries(product.details).map(([k, v]) => `${k}: ${v}`).join("\n") : "";
  return (
    <ActionForm action={saveProduct} className="flex flex-col gap-5">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Labelled label="Name" className="sm:col-span-2">
          <input name="name" required defaultValue={product?.name} className={adminInput} placeholder='Imar Prime 16" Bouncy Unit' />
        </Labelled>
        <Labelled label="URL slug" hint="Leave empty to create it from the name. Changing it breaks old links.">
          <input name="slug" defaultValue={product?.slug} className={adminInput} placeholder="imar-prime-16-bouncy-unit" />
        </Labelled>
        <Labelled label="Sort position" hint="Lower numbers show first in Featured.">
          <input name="position" type="number" min={0} defaultValue={product?.position ?? 0} className={adminInput} />
        </Labelled>
        <Labelled label="Category">
          <select name="categoryId" defaultValue={product?.category_id ?? ""} className={adminInput} required>
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label="Collection">
          <select name="collectionId" defaultValue={product?.collection_id ?? ""} className={adminInput}>
            <option value="">None</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label="Description" className="sm:col-span-2">
          <textarea name="description" rows={3} defaultValue={product?.description ?? ""} className={`${adminInput} h-auto py-2`} />
        </Labelled>
        <Labelled label="Product details" hint="One per line, e.g. Hair: 100% human hair" className="sm:col-span-2">
          <textarea name="details" rows={5} defaultValue={details} className={`${adminInput} h-auto py-2 font-mono`} />
        </Labelled>
        <Labelled label="Care" className="sm:col-span-2">
          <textarea name="care" rows={2} defaultValue={product?.care ?? ""} className={`${adminInput} h-auto py-2`} />
        </Labelled>
      </div>
      <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
        <legend className="text-small mb-2 font-medium">Visibility</legend>
        {[
          ["isPublished", "Published (visible in the shop)", product?.is_published],
          ["isFeatured", "Featured", product?.is_featured],
          ["isBestSeller", "Best seller", product?.is_best_seller],
        ].map(([name, label, checked]) => (
          <label key={name as string} className="text-small flex items-center gap-2">
            <input type="checkbox" name={name as string} defaultChecked={Boolean(checked)} className="size-4 accent-ink" />
            {label as string}
          </label>
        ))}
      </fieldset>
      <div>
        <SubmitButton>{product?.id ? "Save product" : "Create product"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
