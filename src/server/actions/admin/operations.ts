"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { isAdmin, NOT_ALLOWED, refreshStorefront, type AdminState } from "@/server/admin";
import { sendOrderEmail, type OrderEmailType } from "@/server/privileged/email/send";
import { adminErrors, discountSchema, reviewSchema, statusChangeSchema } from "@/lib/validation/admin";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

const fail = (message: string, errors?: string[]): AdminState => ({ status: "error", message, errors });

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export async function changeOrderStatus(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = statusChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Please fix the following:", adminErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: d.orderId,
    p_to_status: d.toStatus,
    p_note: d.note ?? "",
    p_tracking_number: d.trackingNumber ?? "",
    p_tracking_url: d.trackingUrl ?? "",
  });
  if (error) {
    return fail(
      error.message === "INVALID_TRANSITION"
        ? `That status change isn't allowed (${error.details ?? ""}).`
        : error.message === "INVALID_TRACKING_URL"
          ? "Tracking link must start with https://"
          : "Could not update the order.",
    );
  }
  const result = data as { from_status: string; to_status: string; email: OrderEmailType | null };
  let emailNote = "";
  if (result.email && d.notify) {
    const sent = await sendOrderEmail(d.orderId, result.email, { note: d.note });
    emailNote = sent === "sent" ? " Customer emailed." : sent === "skipped" ? " (Email already sent before.)" : " The email could not be sent.";
  }
  // Stock may have moved (cancellations restock), so refresh the shop too.
  refreshStorefront();
  refresh();
  return {
    status: "ok",
    message:
      result.from_status === result.to_status
        ? "Tracking updated."
        : `Status changed to ${ORDER_STATUS_LABEL[result.to_status] ?? result.to_status}.${emailNote}`,
  };
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export async function setStock(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = z
    .object({ variantId: z.uuid(), onHand: z.coerce.number().int().min(0).max(100000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Enter a whole number of units.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_stock", { p_variant_id: parsed.data.variantId, p_on_hand: parsed.data.onHand });
  if (error) {
    return fail(error.message === "BELOW_RESERVED" ? `Too low: ${error.details}.` : "Could not update stock.");
  }
  refreshStorefront();
  refresh();
  return { status: "ok", message: "Saved" };
}

// ---------------------------------------------------------------------------
// Reviews — real customer reviews only (prd.md §6.12, AGENTS rule 10)
// ---------------------------------------------------------------------------
export async function createReview(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Please fix the following:", adminErrors(parsed.error));
  const d = parsed.data;
  const user = await getSessionUser();
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({
    product_id: d.productId,
    author_display_name: d.authorDisplayName,
    rating: d.rating,
    title: d.title,
    body: d.body,
    source: "imported",
    is_approved: d.approve,
    approved_by: d.approve ? user?.id : null,
    approved_at: d.approve ? new Date().toISOString() : null,
  });
  if (error) return fail("Could not save the review.");
  refreshStorefront();
  refresh();
  return { status: "ok", message: d.approve ? "Review published." : "Review saved (not yet published)." };
}

export async function moderateReview(formData: FormData) {
  if (!(await isAdmin())) return;
  const id = z.uuid().safeParse(formData.get("reviewId"));
  if (!id.success) return;
  const intent = formData.get("intent");
  const user = await getSessionUser();
  const supabase = await createClient();
  if (intent === "approve") {
    await supabase.from("reviews").update({ is_approved: true, approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", id.data);
  } else if (intent === "unapprove") {
    await supabase.from("reviews").update({ is_approved: false }).eq("id", id.data);
  } else if (intent === "delete") {
    await supabase.from("reviews").delete().eq("id", id.data);
  }
  refreshStorefront();
  refresh();
}

// ---------------------------------------------------------------------------
// Discount codes
// ---------------------------------------------------------------------------
export async function createDiscount(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = discountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Please fix the following:", adminErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("discount_codes").insert({
    code: d.code,
    type: d.type,
    value: d.value,
    min_subtotal: d.minSubtotal ?? 0,
    ends_at: d.endsAt,
    usage_limit: d.usageLimit,
  });
  if (error) return fail(error.code === "23505" ? "That code already exists." : "Could not create the code.");
  refresh();
  return { status: "ok", message: `Code ${d.code} created.` };
}

export async function toggleDiscount(formData: FormData) {
  if (!(await isAdmin())) return;
  const id = z.uuid().safeParse(formData.get("discountId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("discount_codes").update({ is_active: formData.get("active") === "true" }).eq("id", id.data);
  refresh();
}
