import type { Metadata } from "next";
import { AdminHeader, adminInput, Empty, Labelled, Table } from "@/components/admin/admin-ui";
import { ActionForm, InlineSubmit, SubmitButton } from "@/components/admin/action-form";
import { Stars } from "@/components/product/reviews-list";
import { createClient } from "@/lib/supabase/server";
import { createReview, moderateReview } from "@/server/actions/admin/operations";

export const metadata: Metadata = { title: "Reviews" };

// Real reviews only (AGENTS.md rule 10): add reviews customers actually gave
// you (e.g. on Instagram or WhatsApp) with their permission.
export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const [{ data: reviews }, { data: products }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, author_display_name, rating, title, body, is_approved, source, created_at, product:products(name)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("products").select("id, name").order("name"),
  ]);

  return (
    <div>
      <AdminHeader title="Reviews" description="Only approved reviews appear in the shop. Never publish a review a customer didn't give." />

      <section className="mb-10 max-w-3xl border border-line bg-white p-5">
        <h2 className="text-h3 mb-4">Add a customer review</h2>
        <ActionForm action={createReview} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Product" className="sm:col-span-2">
            <select name="productId" defaultValue="" required className={adminInput}>
              <option value="" disabled>
                Choose…
              </option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Name to show" hint="e.g. Ada O., Lagos">
            <input name="authorDisplayName" required className={adminInput} />
          </Labelled>
          <Labelled label="Rating">
            <select name="rating" defaultValue="5" className={adminInput}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Title (optional)" className="sm:col-span-2">
            <input name="title" className={adminInput} />
          </Labelled>
          <Labelled label="Review" className="sm:col-span-2">
            <textarea name="body" rows={3} required className={`${adminInput} h-auto py-2`} />
          </Labelled>
          <label className="text-small flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="consent" className="size-4 accent-ink" />
            This is a real review and the customer agreed to it being shown.
          </label>
          <label className="text-small flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="approve" defaultChecked className="size-4 accent-ink" />
            Publish now
          </label>
          <div>
            <SubmitButton>Save review</SubmitButton>
          </div>
        </ActionForm>
      </section>

      {reviews?.length ? (
        <Table>
          <thead>
            <tr>
              <th>Review</th>
              <th>Product</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td className="max-w-md">
                  <Stars rating={r.rating} />
                  {r.title && <span className="block font-medium">{r.title}</span>}
                  <span className="block text-taupe">{r.body}</span>
                  <span className="block">— {r.author_display_name}</span>
                </td>
                <td>{r.product?.name}</td>
                <td>{r.is_approved ? <span className="text-success">Published</span> : <span className="text-taupe">Hidden</span>}</td>
                <td>
                  <form action={moderateReview} className="flex flex-col items-start gap-1">
                    <input type="hidden" name="reviewId" value={r.id} />
                    {r.is_approved ? (
                      <InlineSubmit name="intent" value="unapprove">
                        Hide
                      </InlineSubmit>
                    ) : (
                      <InlineSubmit name="intent" value="approve">
                        Publish
                      </InlineSubmit>
                    )}
                    <InlineSubmit name="intent" value="delete" tone="danger" confirm="Delete this review?">
                      Delete
                    </InlineSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No reviews yet. The reviews section stays hidden in the shop until you publish one.</Empty>
      )}
    </div>
  );
}
