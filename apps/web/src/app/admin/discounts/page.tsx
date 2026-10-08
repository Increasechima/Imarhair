import type { Metadata } from "next";
import { AdminHeader, adminInput, Empty, Labelled, Table } from "@/components/admin/admin-ui";
import { ActionForm, InlineSubmit, SubmitButton } from "@/components/admin/action-form";
import { createClient } from "@/lib/supabase/server";
import { createDiscount, toggleDiscount } from "@/server/actions/admin/operations";
import { formatNaira } from "@imarhair/shared/money";

export const metadata: Metadata = { title: "Discount codes" };

export default async function AdminDiscountsPage() {
  const supabase = await createClient();
  const { data: codes } = await supabase
    .from("discount_codes")
    .select("id, code, type, value, min_subtotal, ends_at, usage_limit, times_used, is_active")
    .order("created_at", { ascending: false });

  return (
    <div>
      <AdminHeader title="Discount codes" description="Customers enter these at checkout. One code per order." />

      <section className="mb-10 max-w-3xl border border-line bg-white p-5">
        <h2 className="text-h3 mb-4">New code</h2>
        <ActionForm action={createDiscount} resetOnSuccess className="grid gap-4 sm:grid-cols-3">
          <Labelled label="Code">
            <input name="code" required placeholder="QUEEN10" className={`${adminInput} uppercase`} />
          </Labelled>
          <Labelled label="Type">
            <select name="type" defaultValue="percent" className={adminInput}>
              <option value="percent">% off</option>
              <option value="fixed">₦ off</option>
            </select>
          </Labelled>
          <Labelled label="Value" hint="10 = 10% or ₦10, depending on type">
            <input name="value" required inputMode="decimal" className={adminInput} />
          </Labelled>
          <Labelled label="Minimum spend (₦)" hint="Optional">
            <input name="minSubtotal" inputMode="decimal" className={adminInput} />
          </Labelled>
          <Labelled label="Ends on" hint="Optional (Lagos time)">
            <input name="endsAt" type="date" className={adminInput} />
          </Labelled>
          <Labelled label="Usage limit" hint="Optional, total uses">
            <input name="usageLimit" type="number" min={1} className={adminInput} />
          </Labelled>
          <div className="sm:col-span-3">
            <SubmitButton>Create code</SubmitButton>
          </div>
        </ActionForm>
      </section>

      {codes?.length ? (
        <Table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Minimum</th>
              <th>Ends</th>
              <th>Used</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="font-mono font-medium">{c.code}</td>
                <td>{c.type === "percent" ? `${c.value}% off` : `${formatNaira(c.value)} off`}</td>
                <td className="tabular-nums">{c.min_subtotal ? formatNaira(c.min_subtotal) : "—"}</td>
                <td className="text-taupe">{c.ends_at ? new Date(c.ends_at).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—"}</td>
                <td className="tabular-nums">
                  {c.times_used}
                  {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                </td>
                <td>
                  <form action={toggleDiscount} className="flex items-center gap-3">
                    <input type="hidden" name="discountId" value={c.id} />
                    <input type="hidden" name="active" value={c.is_active ? "false" : "true"} />
                    {c.is_active ? <span className="text-success">Active</span> : <span className="text-taupe">Off</span>}
                    <InlineSubmit>{c.is_active ? "Turn off" : "Turn on"}</InlineSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No discount codes yet.</Empty>
      )}
    </div>
  );
}
