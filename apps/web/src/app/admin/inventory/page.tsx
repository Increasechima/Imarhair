import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, adminInput, Empty, Table } from "@/components/admin/admin-ui";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { createClient } from "@/lib/supabase/server";
import { setStock } from "@/server/actions/admin/operations";

export const metadata: Metadata = { title: "Inventory" };

export default async function AdminInventoryPage(props: PageProps<"/admin/inventory">) {
  const sp = await props.searchParams;
  const low = sp.low === "1";
  const q = typeof sp.q === "string" ? sp.q.replace(/[^\w"' -]/g, "").trim().slice(0, 80) : "";
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variants")
    .select("id, sku, length_inches, density, colour, is_active, product:products!inner(id, name, is_published), inventory(on_hand, reserved, low_stock_threshold)")
    .order("sku");

  const rows = (data ?? [])
    .map((v) => {
      const on = v.inventory?.on_hand ?? 0;
      const reserved = v.inventory?.reserved ?? 0;
      return {
        ...v,
        on,
        reserved,
        available: Math.max(0, on - reserved),
        threshold: v.inventory?.low_stock_threshold ?? 3,
        label: [v.length_inches ? `${v.length_inches}"` : null, v.density, v.colour].filter(Boolean).join(" · "),
      };
    })
    .filter((r) => !q || r.product.name.toLowerCase().includes(q.toLowerCase()) || r.sku.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => !low || (r.is_active && r.available <= r.threshold))
    .sort((a, b) => a.product.name.localeCompare(b.product.name) || a.sku.localeCompare(b.sku));

  return (
    <div>
      <AdminHeader
        title="Inventory"
        description="“In stock” is the physical count. “Held” is reserved by customers paying right now (released after 30 minutes if unpaid)."
      />
      <form className="mb-4 flex flex-wrap items-center gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Product or SKU" className={`${adminInput} max-w-xs`} aria-label="Search stock" />
        <label className="text-small flex items-center gap-2">
          <input type="checkbox" name="low" value="1" defaultChecked={low} className="size-4 accent-ink" />
          Low stock only
        </label>
        <button type="submit" className="text-small h-10 border border-ink px-4">
          Filter
        </button>
      </form>
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Option</th>
              <th>Held</th>
              <th>Available</th>
              <th>In stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.is_active ? "" : "opacity-60"}>
                <td>
                  <Link href={`/admin/products/${r.product.id}`} className="underline underline-offset-4">
                    {r.product.name}
                  </Link>
                  {!r.product.is_published && <span className="block text-taupe">Not published</span>}
                  {!r.is_active && <span className="block text-taupe">Option inactive</span>}
                </td>
                <td className="font-mono">{r.sku}</td>
                <td className="text-taupe">{r.label || "—"}</td>
                <td className="tabular-nums">{r.reserved || "—"}</td>
                <td className={r.available === 0 ? "font-medium text-error" : r.available <= r.threshold ? "text-warning" : "tabular-nums"}>
                  {r.available === 0 ? "Sold out" : r.available}
                </td>
                <td>
                  <ActionForm action={setStock} compact className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="variantId" value={r.id} />
                    <input
                      name="onHand"
                      type="number"
                      min={r.reserved}
                      defaultValue={r.on}
                      aria-label={`Stock for ${r.sku}`}
                      className={`${adminInput} w-20`}
                    />
                    <SubmitButton variant="secondary" className="h-10 px-3 lg:h-10">
                      Save
                    </SubmitButton>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>{low ? "Nothing is low on stock." : "No variants match."}</Empty>
      )}
    </div>
  );
}
