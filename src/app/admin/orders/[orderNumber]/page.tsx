import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, adminInput, Labelled, Table } from "@/components/admin/admin-ui";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { OrderDelivery, OrderItems, OrderTotals, StatusChip } from "@/components/order/order-details";
import { createClient } from "@/lib/supabase/server";
import { changeOrderStatus } from "@/server/actions/admin/operations";
import { NEXT_STATUSES, ORDER_STATUS_LABEL, ORDER_VIEW_SELECT, toOrderView } from "@/lib/orders";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Order" };

const EMAILED = new Set(["processing", "shipped", "delivered", "cancelled", "refunded"]);

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  if (!/^IMR-\d{8}-\d{3,}$/.test(orderNumber)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select(ORDER_VIEW_SELECT).eq("order_number", orderNumber).maybeSingle();
  if (!data) notFound();
  const raw = data as unknown as Parameters<typeof toOrderView>[0] & { user_id: string | null };
  const order = toOrderView(raw);

  const [{ data: history }, { data: payments }] = await Promise.all([
    supabase.from("order_status_history").select("from_status, to_status, note, created_at").eq("order_id", order.id).order("created_at"),
    supabase.from("payments").select("reference, provider, status, amount, channel, paid_at, created_at").eq("order_id", order.id).order("created_at"),
  ]);
  const next = NEXT_STATUSES[order.status] ?? [];

  return (
    <div>
      <Link href="/admin/orders" className="text-small text-taupe hover:underline">
        ← Orders
      </Link>
      <AdminHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${new Date(order.createdAt).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" })}`}
        action={<StatusChip status={order.status} />}
      />

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <OrderItems order={order} />
          <OrderTotals order={order} />
          <div className="mt-8 border-t border-line pt-6">
            <OrderDelivery order={order} />
          </div>

          <section className="mt-10">
            <h2 className="text-h3 mb-3">Payments</h2>
            <Table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.reference}>
                    <td className="font-mono">{p.reference}</td>
                    <td>{p.provider}</td>
                    <td className={p.status === "success" ? "text-success" : p.status === "initialized" ? "text-taupe" : "text-error"}>{p.status}</td>
                    <td className="tabular-nums">{formatNaira(p.amount)}</td>
                    <td className="text-taupe">{p.channel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-8 lg:col-span-5">
          <section className="border border-line bg-white p-5">
            <h2 className="text-h3">Customer</h2>
            <p className="text-small mt-2">
              {order.contactName}
              <br />
              <a href={`mailto:${order.email}`} className="underline underline-offset-4">
                {order.email}
              </a>
            </p>
            {raw.user_id ? (
              <Link href={`/admin/customers/${raw.user_id}`} className="text-small mt-2 inline-block underline underline-offset-4">
                View customer
              </Link>
            ) : (
              <p className="text-small mt-2 text-taupe">Guest checkout</p>
            )}
          </section>

          <section className="border border-line bg-white p-5">
            <h2 className="text-h3">Update order</h2>
            <ActionForm action={changeOrderStatus} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="orderId" value={order.id} />
              <Labelled label="Status">
                <select name="toStatus" defaultValue={next[0] ?? order.status} className={adminInput}>
                  <option value={order.status}>Keep: {ORDER_STATUS_LABEL[order.status]}</option>
                  {next.map((s) => (
                    <option key={s} value={s}>
                      → {ORDER_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Labelled>
              <div className="grid gap-4 sm:grid-cols-2">
                <Labelled label="Tracking number">
                  <input name="trackingNumber" defaultValue={order.trackingNumber ?? ""} className={adminInput} />
                </Labelled>
                <Labelled label="Tracking link">
                  <input name="trackingUrl" type="url" placeholder="https://…" defaultValue={order.trackingUrl ?? ""} className={adminInput} />
                </Labelled>
              </div>
              <Labelled label="Note (optional)" hint="Saved in the history. Included in the customer email if one is sent.">
                <textarea name="note" rows={2} className={`${adminInput} h-auto py-2`} />
              </Labelled>
              <label className="text-small flex items-center gap-2">
                <input type="checkbox" name="notify" defaultChecked className="size-4 accent-ink" />
                Email the customer about this change ({[...EMAILED].map((s) => ORDER_STATUS_LABEL[s]).join(", ")})
              </label>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
            {order.status === "refunded" && (
              <p className="text-small mt-4 text-taupe">Refunds are issued from the payment provider&rsquo;s dashboard. This status records it.</p>
            )}
          </section>

          <section>
            <h2 className="text-h3 mb-3">History</h2>
            <ol className="text-small flex flex-col gap-3 border-l border-line pl-4">
              {(history ?? []).map((h, i) => (
                <li key={i}>
                  <span className="font-medium">
                    {h.from_status && h.from_status !== h.to_status ? `${ORDER_STATUS_LABEL[h.from_status]} → ` : ""}
                    {ORDER_STATUS_LABEL[h.to_status]}
                  </span>
                  <span className="block text-taupe">{new Date(h.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
                  {h.note && <span className="block">{h.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
