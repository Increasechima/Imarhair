import "server-only";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";
import { supabaseAdmin } from "@/server/privileged/supabase-admin";
import { deliverEmail } from "./mailgun";
import { orderConfirmationEmail, orderStatusEmail, type StatusEmailType } from "./templates";

export type OrderEmailType = "order_confirmation" | StatusEmailType;

/**
 * Sends an order email at most once per (order, type) — guarded by the
 * email_log unique index. Never throws: email problems must not break checkout.
 */
export async function sendOrderEmail(
  orderId: string,
  type: OrderEmailType,
  opts: { note?: string | null } = {},
): Promise<"sent" | "skipped" | "failed"> {
  const db = supabaseAdmin();
  try {
    const { data: already } = await db
      .from("email_log")
      .select("id")
      .eq("order_id", orderId)
      .eq("type", type)
      .eq("status", "sent")
      .maybeSingle();
    if (already) return "skipped";

    const { data: order, error } = await db
      .from("orders")
      .select(
        `id, order_number, user_id, email, access_token, contact_name, subtotal, delivery_fee, discount_total, total,
         shipping_name, shipping_phone, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_country,
         delivery_method_name, delivery_eta_text, tracking_number, tracking_url,
         order_items(product_name, variant_label, quantity, line_total)`,
      )
      .eq("id", orderId)
      .single();
    if (error || !order) throw new Error(`order ${orderId} not found`);

    const orderUrl = order.user_id
      ? `${publicEnv.siteUrl}/account/orders/${order.order_number}`
      : `${publicEnv.siteUrl}/checkout/confirmation/${order.order_number}?t=${order.access_token}`;

    const support = { email: serverEnv.supportEmail, phone: serverEnv.supportPhone };
    const email =
      type !== "order_confirmation"
        ? orderStatusEmail(type, {
            orderNumber: order.order_number,
            customerName: order.contact_name,
            orderUrl,
            support,
            total: order.total,
            trackingNumber: order.tracking_number,
            trackingUrl: order.tracking_url,
            note: opts.note ?? null,
          })
        : orderConfirmationEmail({
      orderNumber: order.order_number,
      customerName: order.contact_name,
      items: order.order_items.map((i) => ({
        name: i.product_name,
        variantLabel: i.variant_label,
        quantity: i.quantity,
        lineTotal: i.line_total,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      discount: order.discount_total,
      total: order.total,
      address: [
        order.shipping_name,
        order.shipping_line1,
        order.shipping_line2,
        `${order.shipping_city}, ${order.shipping_state}`,
        order.shipping_country === "NG" ? "Nigeria" : order.shipping_country,
        order.shipping_phone,
      ].filter((x): x is string => Boolean(x)),
      deliveryMethod: order.delivery_method_name,
      deliveryEta: order.delivery_eta_text,
      orderUrl,
      support: { email: serverEnv.supportEmail, phone: serverEnv.supportPhone },
    });

    const { id } = await deliverEmail({ to: order.email, ...email });
    const { error: logError } = await db.from("email_log").insert({
      order_id: order.id,
      user_id: order.user_id,
      type,
      to_email: order.email,
      provider_message_id: id,
      status: "sent",
    });
    // 23505: a concurrent call logged it first — fine, it was sent.
    if (logError && logError.code !== "23505") console.error("email_log insert failed", { code: logError.code });
    return "sent";
  } catch (e) {
    console.error(`sendOrderEmail(${type}) failed`, { orderId, message: (e as Error).message });
    await db
      .from("email_log")
      .insert({ order_id: orderId, type, to_email: "unknown", status: "failed", error: (e as Error).message.slice(0, 500) })
      .then(() => undefined, () => undefined);
    return "failed";
  }
}
