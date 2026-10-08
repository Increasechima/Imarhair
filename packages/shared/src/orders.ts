import { z } from "zod";

// Shared order/quote types and labels (safe for client and server).

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  ready_for_dispatch: "Ready for dispatch",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export type LineIssue = "unavailable" | "sold_out" | "insufficient";

const quoteLine = z.object({
  variant_id: z.string(),
  product_id: z.string().nullable(),
  product_name: z.string().nullable(),
  slug: z.string().nullable(),
  sku: z.string().nullable(),
  variant_label: z.string().nullable(),
  image_path: z.string().nullable(),
  unit_price: z.number().nullable(),
  quantity: z.number(),
  line_total: z.number(),
  available: z.number(),
  issue: z.enum(["unavailable", "sold_out", "insufficient"]).nullable(),
});

export const quoteSchema = z.object({
  lines: z.array(quoteLine),
  subtotal: z.number(),
  zone: z.string(),
  delivery: z
    .object({
      code: z.string(),
      name: z.string(),
      zone: z.string(),
      fee: z.number(),
      eta_min_days: z.number(),
      eta_max_days: z.number(),
      eta_text: z.string(),
    })
    .nullable(),
  delivery_fee: z.number(),
  discount: z.number(),
  discount_code_id: z.string().nullable(),
  discount_error: z.enum(["invalid", "min_subtotal"]).nullable(),
  discount_min_subtotal: z.number().nullable(),
  total: z.number(),
  issues: z.number(),
});

export type Quote = z.infer<typeof quoteSchema>;

export type CartLineView = {
  variantId: string;
  productName: string | null;
  slug: string | null;
  variantLabel: string | null;
  imagePath: string | null;
  unitPrice: number | null;
  quantity: number;
  lineTotal: number;
  available: number;
  issue: LineIssue | null;
};

export type CartView = { lines: CartLineView[]; subtotal: number; issues: number };

export function toCartView(q: Quote): CartView {
  return {
    lines: q.lines.map((l) => ({
      variantId: l.variant_id,
      productName: l.product_name,
      slug: l.slug,
      variantLabel: l.variant_label,
      imagePath: l.image_path,
      unitPrice: l.unit_price,
      quantity: l.quantity,
      lineTotal: l.line_total,
      available: l.available,
      issue: l.issue,
    })),
    subtotal: q.subtotal,
    issues: q.issues,
  };
}

export const ISSUE_MESSAGE: Record<LineIssue, (available: number) => string> = {
  unavailable: () => "This item is no longer available.",
  sold_out: () => "Sold out. Remove it to continue.",
  insufficient: (n) => `Only ${n} left. Reduce the quantity to continue.`,
};

export type OrderView = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  email: string;
  contactName: string;
  items: {
    variantId: string | null;
    name: string;
    variantLabel: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imagePath: string | null;
  }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  address: string[];
  deliveryMethod: string;
  deliveryEta: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  latestPaymentStatus: string | null;
  accessToken: string;
  isGuest: boolean;
};

/** Columns needed to build an OrderView (keep in sync with toOrderView). */
export const ORDER_VIEW_SELECT = `id, order_number, status, created_at, paid_at, email, contact_name, user_id, access_token,
  subtotal, delivery_fee, discount_total, total,
  shipping_name, shipping_phone, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_country,
  delivery_method_name, delivery_eta_text, tracking_number, tracking_url,
  order_items(variant_id, product_name, variant_label, quantity, unit_price, line_total, image_path),
  payments(status, created_at)`;

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  email: string;
  contact_name: string;
  user_id: string | null;
  access_token: string;
  subtotal: number;
  delivery_fee: number;
  discount_total: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  delivery_method_name: string;
  delivery_eta_text: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  order_items: { variant_id: string | null; product_name: string; variant_label: string | null; quantity: number; unit_price: number; line_total: number; image_path: string | null }[];
  payments: { status: string; created_at: string }[];
};

export function toOrderView(o: OrderRow): OrderView {
  const latest = [...(o.payments ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    email: o.email,
    contactName: o.contact_name,
    items: o.order_items.map((i) => ({
      variantId: i.variant_id,
      name: i.product_name,
      variantLabel: i.variant_label,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
      imagePath: i.image_path,
    })),
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    discount: o.discount_total,
    total: o.total,
    address: [
      o.shipping_name,
      o.shipping_line1,
      o.shipping_line2,
      `${o.shipping_city}, ${o.shipping_state}`,
      o.shipping_country === "NG" ? "Nigeria" : o.shipping_country,
      o.shipping_phone,
    ].filter((x): x is string => Boolean(x)),
    deliveryMethod: o.delivery_method_name,
    deliveryEta: o.delivery_eta_text,
    trackingNumber: o.tracking_number,
    trackingUrl: o.tracking_url,
    latestPaymentStatus: latest?.status ?? null,
    accessToken: o.access_token,
    isGuest: o.user_id === null,
  };
}

/** Status changes an admin may make from each status (mirrors admin_update_order_status). */
export const NEXT_STATUSES: Record<string, string[]> = {
  pending_payment: ["cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["ready_for_dispatch", "shipped", "cancelled", "refunded"],
  ready_for_dispatch: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};
