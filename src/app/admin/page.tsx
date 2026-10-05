import { createClient } from "@/lib/supabase/server";

// M1 dashboard: live catalogue counts to prove admin access + RLS end to end.
// Revenue, orders needing action and low-stock lists come in M4 (prd.md §6.18).
export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [products, published, orders] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Products", value: products.count },
    { label: "Published", value: published.count },
    { label: "Orders", value: orders.count },
  ];

  return (
    <div>
      <h1 className="text-h2">Dashboard</h1>
      <dl className="mt-8 grid max-w-2xl grid-cols-3 border border-line">
        {stats.map((stat) => (
          <div key={stat.label} className="border-r border-line p-5 last:border-r-0">
            <dt className="text-label text-taupe">{stat.label}</dt>
            <dd className="text-h2 mt-2 tabular-nums">{stat.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
