import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";
import { catalogClient } from "@/lib/supabase/catalog";
import { formatNaira } from "@/lib/money";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description: "Delivery options, prices and times for Imarhair orders in Lagos, across Nigeria and internationally.",
  alternates: { canonical: "/shipping" },
};

const ZONES = [
  { zone: "lagos", label: "Lagos" },
  { zone: "nigeria", label: "Rest of Nigeria" },
  { zone: "international", label: "International" },
] as const;

const eta = (min: number, max: number) => (max <= 1 ? "Same or next working day" : `${min}–${max} working days`);

// Prices and times come from the same delivery_rates table checkout uses,
// so this page can never disagree with what customers are charged.
export default async function ShippingPage() {
  const { data: methods } = await catalogClient()
    .from("delivery_methods")
    .select("code, name, description, delivery_rates(zone, price, eta_min_days, eta_max_days)")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <ContentPage
      title="Shipping & Delivery"
      intro="We deliver across Nigeria and to selected countries. Choose your option at checkout."
      draft
    >
      <h2>Delivery options</h2>
      <div className="not-prose mt-4 overflow-x-auto border border-line">
        <table className="text-small w-full text-left">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 font-medium">Where</th>
              {(methods ?? []).map((m) => (
                <th key={m.code} className="px-4 py-3 font-medium">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ZONES.map(({ zone, label }) => (
              <tr key={zone} className="border-t border-line">
                <th scope="row" className="px-4 py-3 font-medium">
                  {label}
                </th>
                {(methods ?? []).map((m) => {
                  const r = m.delivery_rates.find((x) => x.zone === zone);
                  return (
                    <td key={m.code} className="px-4 py-3 text-taupe">
                      {r ? (
                        <>
                          <span className="text-ink">{formatNaira(r.price)}</span>
                          <br />
                          {eta(r.eta_min_days, r.eta_max_days)}
                        </>
                      ) : (
                        "Not available"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4">Times are counted in working days from when your payment is confirmed.</p>

      <h2>After you order</h2>
      <ul>
        <li>You&rsquo;ll get an order confirmation by email as soon as your payment is verified.</li>
        <li>We email you again when your order is on its way, with tracking where available.</li>
        <li>
          Signed-in customers can follow every order under <Link href="/account/orders">My orders</Link>.
        </li>
      </ul>

      <h2>Questions</h2>
      <p>
        If your delivery is late or something isn&rsquo;t right, <Link href="/contact">contact us</Link> with your order number and
        we&rsquo;ll sort it out.
      </p>
    </ContentPage>
  );
}
