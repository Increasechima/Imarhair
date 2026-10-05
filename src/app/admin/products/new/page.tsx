import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: collections }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("collections").select("id, name").order("sort_order"),
  ]);
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-small text-taupe hover:underline">
        ← Products
      </Link>
      <AdminHeader title="New product" description="Create it here, then add options (lengths, colours…), stock and photos before publishing." />
      <ProductForm categories={categories ?? []} collections={collections ?? []} />
    </div>
  );
}
