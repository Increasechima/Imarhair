import type { Metadata } from "next";
import { AddressBook } from "@/components/account/address-book";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved addresses", robots: { index: false } };

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, full_name, phone, line1, line2, city, state, country, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-h1">Saved addresses</h1>
      <p className="text-body mt-2 mb-8 text-taupe">Choose one at checkout so you don&rsquo;t have to type it again.</p>
      <AddressBook addresses={addresses ?? []} />
    </div>
  );
}
