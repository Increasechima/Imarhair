import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, adminInput, Empty, Pager, Table } from "@/components/admin/admin-ui";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Customers" };
const PAGE_SIZE = 50;

export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data: customers } = await supabase.rpc("admin_list_customers", {
    p_search: q,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const total = Number(customers?.[0]?.total_count ?? 0);

  return (
    <div>
      <AdminHeader title="Customers" description="Account holders. Guest orders appear under Orders." />
      <form className="mb-4 flex gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Name, email or phone" className={`${adminInput} max-w-xs`} aria-label="Search customers" />
        <button type="submit" className="text-small h-10 border border-ink px-4">
          Search
        </button>
      </form>
      {customers?.length ? (
        <Table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Spent</th>
              <th>Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="font-medium underline underline-offset-4">
                    {c.full_name || "—"}
                  </Link>
                  <span className="block text-taupe">{c.email}</span>
                </td>
                <td className="text-taupe">{c.phone ?? "—"}</td>
                <td className="whitespace-nowrap text-taupe">{new Date(c.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                <td className="tabular-nums">{Number(c.orders_count)}</td>
                <td className="tabular-nums">{formatNaira(Number(c.total_spent))}</td>
                <td className="whitespace-nowrap text-taupe">
                  {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No customers found.</Empty>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={total} href={(p) => `/admin/customers?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`} />
    </div>
  );
}
