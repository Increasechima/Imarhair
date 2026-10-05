import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, adminInput, Empty, Table } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { ProductImage } from "@/components/product/product-image";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[^\w"' -]/g, "").trim().slice(0, 80) : "";
  const show = typeof sp.show === "string" ? sp.show : "";

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      `id, name, slug, is_published, is_featured, is_best_seller, updated_at,
       collection:collections(name),
       product_images(storage_path, position),
       product_variants(price, is_active, inventory(on_hand, reserved))`,
    )
    .order("updated_at", { ascending: false });
  if (q) query = query.ilike("name", `%${q}%`);
  if (show === "published") query = query.eq("is_published", true);
  if (show === "hidden") query = query.eq("is_published", false);
  const { data: products } = await query;

  return (
    <div>
      <AdminHeader title="Products" action={<ButtonLink href="/admin/products/new">New product</ButtonLink>} />
      <form className="mb-4 flex flex-wrap gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Search by name" className={`${adminInput} max-w-xs`} aria-label="Search products" />
        <select name="show" defaultValue={show} className={`${adminInput} max-w-44`} aria-label="Visibility">
          <option value="">All</option>
          <option value="published">Published</option>
          <option value="hidden">Not published</option>
        </select>
        <button type="submit" className="text-small h-10 border border-ink px-4">
          Filter
        </button>
      </form>
      {products?.length ? (
        <Table>
          <thead>
            <tr>
              <th className="w-14"></th>
              <th>Product</th>
              <th>Collection</th>
              <th>Price</th>
              <th>Variants</th>
              <th>Available</th>
              <th>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const active = p.product_variants.filter((v) => v.is_active);
              const prices = active.map((v) => v.price);
              const available = active.reduce((n, v) => n + Math.max(0, (v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0)), 0);
              const image = [...p.product_images].sort((a, b) => a.position - b.position)[0];
              return (
                <tr key={p.id}>
                  <td>
                    <div className="w-10">
                      <ProductImage path={image?.storage_path} alt="" sizes="40px" />
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="font-medium underline underline-offset-4">
                      {p.name}
                    </Link>
                    <span className="block text-taupe">/{p.slug}</span>
                  </td>
                  <td className="text-taupe">{p.collection?.name ?? "—"}</td>
                  <td className="whitespace-nowrap tabular-nums">
                    {prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatNaira(prices[0]) : `${formatNaira(Math.min(...prices))}+`) : "—"}
                  </td>
                  <td>{active.length}</td>
                  <td className={available === 0 ? "text-error" : available <= 3 ? "text-warning" : ""}>{available}</td>
                  <td>
                    {p.is_published ? <span className="text-success">Published</span> : <span className="text-taupe">Hidden</span>}
                    {p.is_featured && <span className="block text-taupe">Featured</span>}
                    {p.is_best_seller && <span className="block text-taupe">Best seller</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <Empty>No products yet. Create your first one.</Empty>
      )}
    </div>
  );
}
