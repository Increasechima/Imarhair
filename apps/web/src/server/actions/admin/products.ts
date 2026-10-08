"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, NOT_ALLOWED, refreshStorefront, type AdminState } from "@/server/admin";
import { adminErrors, productSchema, variantSchema } from "@/lib/validation/admin";
import type { Json } from "@imarhair/shared/database.types";

const uuid = z.uuid();
const fail = (message: string, errors?: string[]): AdminState => ({ status: "error", message, errors });

/** Create or update a product (catalogue edits go through admin RLS policies). */
export async function saveProduct(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const id = formData.get("id") ? String(formData.get("id")) : null;
  if (id && !uuid.safeParse(id).success) return fail("Invalid product.");
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Please fix the following:", adminErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();

  if (d.isPublished) {
    if (!id) return fail("Save the product and add at least one variant before publishing.");
    const { count } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id)
      .eq("is_active", true);
    if (!count) return fail("Add at least one active variant before publishing.");
  }

  const row = {
    name: d.name,
    slug: d.slug,
    description: d.description,
    care: d.care,
    details: d.details as { [key: string]: Json },
    category_id: d.categoryId,
    collection_id: d.collectionId,
    position: d.position,
    is_published: d.isPublished,
    is_featured: d.isFeatured,
    is_best_seller: d.isBestSeller,
  };

  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return fail(error.code === "23505" ? "That URL slug is already used by another product." : "Could not save the product.");
    refreshStorefront();
    refresh();
    return { status: "ok", message: "Product saved." };
  }

  const { data, error } = await supabase.from("products").insert({ ...row, base_price: 0 }).select("id").single();
  if (error) console.error("product insert failed", { code: error.code, message: error.message });
  if (error) return fail(error.code === "23505" ? "That URL slug is already used by another product." : "Could not create the product.");
  redirect(`/admin/products/${data.id}?created=1`);
}

/** Create or update a variant; optionally sets its stock through admin_set_stock. */
export async function saveVariant(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const productId = String(formData.get("productId") ?? "");
  const variantId = formData.get("variantId") ? String(formData.get("variantId")) : null;
  if (!uuid.safeParse(productId).success || (variantId && !uuid.safeParse(variantId).success)) return fail("Invalid variant.");
  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Please fix the following:", adminErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();

  if (d.isDefault) {
    await supabase.from("product_variants").update({ is_default: false }).eq("product_id", productId).neq("id", variantId ?? "00000000-0000-0000-0000-000000000000");
  }
  const row = {
    product_id: productId,
    sku: d.sku,
    length_inches: d.lengthInches,
    density: d.density,
    colour: d.colour,
    lace_type: d.laceType,
    price: d.price,
    compare_at_price: d.compareAtPrice,
    is_default: d.isDefault,
    is_active: d.isActive,
  };
  const res = variantId
    ? await supabase.from("product_variants").update(row).eq("id", variantId).select("id").single()
    : await supabase.from("product_variants").insert(row).select("id").single();
  if (res.error) {
    return fail(
      res.error.code === "23505"
        ? "That SKU, or that exact combination of options, already exists."
        : "Could not save the variant.",
    );
  }

  if (d.stock !== undefined) {
    const { error } = await supabase.rpc("admin_set_stock", { p_variant_id: res.data.id, p_on_hand: d.stock });
    if (error) {
      return fail(error.message === "BELOW_RESERVED" ? `Stock can't go below what's being checked out right now (${error.details ?? ""}).` : "Variant saved, but the stock update failed.");
    }
  }

  // Keep the product's "from" price in step with its cheapest active variant.
  const { data: prices } = await supabase.from("product_variants").select("price").eq("product_id", productId).eq("is_active", true);
  const min = prices?.length ? Math.min(...prices.map((p) => p.price)) : 0;
  await supabase.from("products").update({ base_price: min }).eq("id", productId);

  // A product with no active variants can't stay on sale.
  if (!prices?.length) await supabase.from("products").update({ is_published: false }).eq("id", productId);

  refreshStorefront();
  refresh();
  return { status: "ok", message: variantId ? "Variant saved." : "Variant added." };
}

/** Registers an image the browser already uploaded to products/<productId>/… */
export async function addProductImage(input: { productId: string; path: string; width: number; height: number; alt: string }): Promise<AdminState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = z
    .object({
      productId: z.uuid(),
      path: z.string().regex(/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/),
      width: z.number().int().min(1).max(8000),
      height: z.number().int().min(1).max(8000),
      alt: z.string().trim().min(3).max(200),
    })
    .safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`products/${parsed.data.productId}/`)) return fail("Invalid image.");
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", parsed.data.productId)
    .order("position", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("product_images").insert({
    product_id: parsed.data.productId,
    storage_path: parsed.data.path,
    alt: parsed.data.alt,
    width: parsed.data.width,
    height: parsed.data.height,
    position: (last?.[0]?.position ?? -1) + 1,
  });
  if (error) return fail("Could not save the image.");
  refreshStorefront();
  refresh();
  return { status: "ok", message: "Image added." };
}

/** Form actions for image rows: alt text, move up/down, delete. */
export async function updateImage(formData: FormData) {
  if (!(await isAdmin())) return;
  const imageId = String(formData.get("imageId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!uuid.safeParse(imageId).success) return;
  const supabase = await createClient();
  const { data: image } = await supabase.from("product_images").select("id, product_id, position, storage_path").eq("id", imageId).single();
  if (!image) return;

  if (intent === "alt") {
    const alt = String(formData.get("alt") ?? "").trim().slice(0, 200);
    if (alt.length >= 3) await supabase.from("product_images").update({ alt }).eq("id", imageId);
  } else if (intent === "up" || intent === "down") {
    const { data: siblings } = await supabase
      .from("product_images")
      .select("id, position")
      .eq("product_id", image.product_id)
      .order("position");
    const list = siblings ?? [];
    const i = list.findIndex((s) => s.id === imageId);
    const j = intent === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      // Re-number so positions stay contiguous, then swap the pair.
      const order = list.map((s) => s.id);
      [order[i], order[j]] = [order[j], order[i]];
      await Promise.all(order.map((id, position) => supabase.from("product_images").update({ position }).eq("id", id)));
    }
  } else if (intent === "delete") {
    await supabase.from("product_images").delete().eq("id", imageId);
    // Only remove files this admin uploaded; shared dev assets live under catalog/.
    if (image.storage_path.startsWith("products/")) {
      await supabase.storage.from("product-images").remove([image.storage_path]);
    }
  }
  refreshStorefront();
  refresh();
}
