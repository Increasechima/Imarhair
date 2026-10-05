import type { Metadata } from "next";
import { CheckoutForm, type DeliveryOption, type SavedAddress } from "@/components/checkout/checkout-form";
import { createClient, getProfile, getSessionUser } from "@/lib/supabase/server";
import { catalogClient } from "@/lib/supabase/catalog";
import { serverEnv } from "@/server/env";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

// Single-page checkout (prd.md §6.11). Guests welcome; signed-in shoppers get
// their details and saved addresses pre-filled.
export default async function CheckoutPage() {
  const user = await getSessionUser();
  const [profile, addressRes, methodsRes] = await Promise.all([
    getProfile(),
    user
      ? (await createClient())
          .from("addresses")
          .select("id, full_name, phone, line1, line2, city, state, country, is_default")
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as SavedAddress[] }),
    catalogClient()
      .from("delivery_methods")
      .select("code, name, description, delivery_rates(zone, price, eta_min_days, eta_max_days)")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const methods: DeliveryOption[] = (methodsRes.data ?? []).map((m) => ({
    code: m.code,
    name: m.name,
    description: m.description,
    rates: m.delivery_rates.map((r) => ({ zone: r.zone, price: r.price, etaMin: r.eta_min_days, etaMax: r.eta_max_days })),
  }));

  let provider: "paystack" | "mock" = "paystack";
  try {
    provider = serverEnv.paymentProvider;
  } catch {
    provider = "paystack";
  }

  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="text-h1 mb-8 lg:mb-10">Checkout</h1>
      <CheckoutForm
        methods={methods}
        account={
          user
            ? { email: user.email ?? "", fullName: profile?.full_name ?? "", phone: profile?.phone ?? "" }
            : null
        }
        addresses={(addressRes.data ?? []) as SavedAddress[]}
        paymentProvider={provider}
      />
    </div>
  );
}
