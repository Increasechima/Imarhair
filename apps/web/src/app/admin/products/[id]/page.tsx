import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-ui";
import { InlineSubmit } from "@/components/admin/action-form";
import { ProductForm } from "@/components/admin/product-form";
import { VariantForm, type AdminVariant } from "@/components/admin/variant-row";
import { ImageUploader } from "@/components/admin/image-uploader";
import { ProductImage } from "@/components/product/product-image";
import { createClient } from "@/lib/supabase/server";
import { updateImage } from "@/server/actions/admin/products";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, { data: collections }] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, name, slug, description, care, details, category_id, collection_id, position, is_published, is_featured, is_best_seller,
         product_images(id, storage_path, alt, position),
         product_variants(id, sku, length_inches, density, colour, lace_type, price, compare_at_price, is_default, is_active, position, inventory(on_hand, reserved))`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("collections").select("id, name").order("sort_order"),
  ]);
  if (!product) notFound();

  const variants: AdminVariant[] = [...product.product_variants]
    .sort((a, b) => a.position - b.position || a.price - b.price)
    .map((v) => ({ ...v, on_hand: v.inventory?.on_hand ?? 0, reserved: v.inventory?.reserved ?? 0 }));
  const images = [...product.product_images].sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/products" className="text-small text-taupe hover:underline">
        ← Products
      </Link>
      <AdminHeader
        title={product.name}
        description={product.is_published ? "Published" : "Not published: only admins can see it."}
        action={
          product.is_published ? (
            <Link href={`/shop/${product.slug}`} target="_blank" className="text-small underline underline-offset-4">
              View in shop ↗
            </Link>
          ) : undefined
        }
      />
      {sp.created === "1" && (
        <p role="status" className="text-small mb-6 border-l-2 border-success bg-white px-4 py-3 text-success">
          Product created. Now add its options and photos, then tick Published.
        </p>
      )}

      <section className="mb-12">
        <ProductForm
          product={{ ...product, details: (product.details ?? {}) as Record<string, string> }}
          categories={categories ?? []}
          collections={collections ?? []}
        />
      </section>

      <section className="mb-12">
        <h2 className="text-h3">Options, prices and stock</h2>
        <p className="text-small mt-1 mb-4 text-taupe">
          Each row is one buyable option (e.g. 16&quot; · 300g). Fill only the fields that apply; customers choose between the values that differ.
        </p>
        <div className="flex flex-col gap-3">
          {variants.map((v) => (
            <VariantForm key={v.id} productId={product.id} variant={v} />
          ))}
          <p className="text-label mt-4">Add an option</p>
          <VariantForm productId={product.id} />
        </div>
      </section>

      <section>
        <h2 className="text-h3">Photos</h2>
        <p className="text-small mt-1 mb-4 text-taupe">The first photo is the main one. Use clear 4:5 portrait photos where possible.</p>
        <ImageUploader productId={product.id} productName={product.name} />
        {images.length > 0 && (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, i) => (
              <li key={img.id} className="border border-line bg-white p-3">
                <ProductImage path={img.storage_path} alt={img.alt} sizes="300px" />
                <form action={updateImage} className="mt-3 flex gap-2">
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="intent" value="alt" />
                  <input name="alt" defaultValue={img.alt} aria-label="Image description" className="text-small h-9 min-w-0 flex-1 border border-line px-2" />
                  <InlineSubmit>Save</InlineSubmit>
                </form>
                <div className="mt-2 flex gap-4">
                  {i > 0 && (
                    <form action={updateImage}>
                      <input type="hidden" name="imageId" value={img.id} />
                      <InlineSubmit name="intent" value="up">
                        ← Move earlier
                      </InlineSubmit>
                    </form>
                  )}
                  {i < images.length - 1 && (
                    <form action={updateImage}>
                      <input type="hidden" name="imageId" value={img.id} />
                      <InlineSubmit name="intent" value="down">
                        Move later →
                      </InlineSubmit>
                    </form>
                  )}
                  <form action={updateImage} className="ml-auto">
                    <input type="hidden" name="imageId" value={img.id} />
                    <InlineSubmit name="intent" value="delete" tone="danger" confirm="Delete this photo?">
                      Delete
                    </InlineSubmit>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
