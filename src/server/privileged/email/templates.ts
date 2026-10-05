import "server-only";
import { formatNaira } from "@/lib/money";

// Table-based, inline-styled emails (Style.md §10): ivory background, white
// panel, typeset IMAR wordmark, ink CTA, beige footer. Plain-text alternative
// always included.

export type OrderEmailData = {
  orderNumber: string;
  customerName: string;
  items: { name: string; variantLabel: string | null; quantity: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  address: string[];
  deliveryMethod: string;
  deliveryEta: string | null;
  orderUrl: string;
  support: { email: string | null; phone: string | null };
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const font = "font-family:Helvetica,Arial,sans-serif;";
const serif = "font-family:Georgia,'Times New Roman',serif;";

function layout(title: string, inner: string, support: OrderEmailData["support"]) {
  const contact = [support.email && `<a href="mailto:${esc(support.email)}" style="color:#5f584f;">${esc(support.email)}</a>`, support.phone && esc(support.phone)]
    .filter(Boolean)
    .join(" · ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#faf8f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f4;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
<tr><td align="center" style="padding:36px 32px 8px;${serif}font-size:26px;letter-spacing:12px;color:#111111;">I<span style="color:#c4922b;">M</span>AR</td></tr>
${inner}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#f2ede5;">
<tr><td align="center" style="padding:24px 16px;${font}font-size:12px;line-height:1.6;color:#5f584f;">
Questions about your order? Just reply to this email${contact ? `, or contact us: ${contact}` : ""}.<br>
<a href="https://www.instagram.com/imarhair" style="color:#5f584f;">Instagram @imarhair</a><br>
Imarhair Limited · Classy. Confident. IMAR.
</td></tr></table>
</td></tr></table></body></html>`;
}

export function orderConfirmationEmail(d: OrderEmailData) {
  const firstName = d.customerName.split(" ")[0] || "Queen";
  const rows = d.items
    .map(
      (i) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid #e3ddd3;${font}font-size:14px;color:#111111;">${esc(i.name)}${
        i.variantLabel ? `<br><span style="color:#5f584f;font-size:13px;">${esc(i.variantLabel)}</span>` : ""
      }<br><span style="color:#5f584f;font-size:13px;">Qty ${i.quantity}</span></td>
<td align="right" style="padding:12px 0;border-bottom:1px solid #e3ddd3;${font}font-size:14px;color:#111111;white-space:nowrap;">${formatNaira(i.lineTotal)}</td></tr>`,
    )
    .join("");
  const totalRow = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;${font}font-size:${strong ? 16 : 14}px;color:${strong ? "#111111" : "#5f584f"};${strong ? "font-weight:bold;" : ""}">${label}</td><td align="right" style="padding:4px 0;${font}font-size:${strong ? 16 : 14}px;color:#111111;${strong ? "font-weight:bold;" : ""}">${value}</td></tr>`;

  const inner = `
<tr><td align="center" style="padding:24px 40px 4px;${serif}font-size:28px;color:#111111;">Order Confirmed!</td></tr>
<tr><td align="center" style="padding:8px 40px 4px;${font}font-size:16px;line-height:1.6;color:#5f584f;">Thank you for shopping with Imarhair, Queen. Your payment was successful and we&rsquo;ve received your order.</td></tr>
<tr><td align="center" style="padding:12px 40px 24px;${font}font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#111111;">Order #${esc(d.orderNumber)}</td></tr>
<tr><td style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
<tr><td style="padding:16px 40px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${totalRow("Subtotal", formatNaira(d.subtotal))}
${totalRow("Delivery", d.deliveryFee ? formatNaira(d.deliveryFee) : "Free")}
${d.discount ? totalRow("Discount", `−${formatNaira(d.discount)}`) : ""}
${totalRow("Total", formatNaira(d.total), true)}
</table></td></tr>
<tr><td style="padding:24px 40px 8px;${font}font-size:14px;line-height:1.6;color:#111111;">
<strong style="font-size:12px;letter-spacing:2px;text-transform:uppercase;">Delivering to</strong><br>
${d.address.map(esc).join("<br>")}<br><br>
<strong style="font-size:12px;letter-spacing:2px;text-transform:uppercase;">Delivery</strong><br>
${esc(d.deliveryMethod)}${d.deliveryEta ? ` · ${esc(d.deliveryEta)}` : ""}
</td></tr>
<tr><td align="center" style="padding:28px 40px 40px;">
<a href="${esc(d.orderUrl)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;${font}font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:16px 32px;border-radius:2px;">View my order</a>
</td></tr>`;

  const text = [
    `Order Confirmed!`,
    ``,
    `Hi ${firstName}, thank you for shopping with Imarhair, Queen.`,
    `Your payment was successful and we've received your order.`,
    ``,
    `Order #${d.orderNumber}`,
    ...d.items.map((i) => `- ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} x${i.quantity}: ${formatNaira(i.lineTotal)}`),
    ``,
    `Subtotal: ${formatNaira(d.subtotal)}`,
    `Delivery: ${d.deliveryFee ? formatNaira(d.deliveryFee) : "Free"}`,
    ...(d.discount ? [`Discount: -${formatNaira(d.discount)}`] : []),
    `Total: ${formatNaira(d.total)}`,
    ``,
    `Delivering to:`,
    ...d.address,
    `Delivery: ${d.deliveryMethod}${d.deliveryEta ? ` (${d.deliveryEta})` : ""}`,
    ``,
    `View your order: ${d.orderUrl}`,
    ``,
    `Questions? Reply to this email${d.support.email ? ` or write to ${d.support.email}` : ""}${d.support.phone ? `, ${d.support.phone}` : ""}.`,
    `Imarhair Limited · Classy. Confident. IMAR.`,
  ].join("\n");

  return { subject: `Order confirmed: #${d.orderNumber}`, html: layout("Order confirmed", inner, d.support), text };
}

export type StatusEmailType = "order_processing" | "order_shipped" | "order_delivered" | "order_cancelled" | "order_refunded";

const STATUS_COPY: Record<StatusEmailType, { subject: (n: string) => string; title: string; body: string }> = {
  order_processing: {
    subject: (n) => `We're preparing your order #${n}`,
    title: "Your order is being prepared",
    body: "Good news, Queen. We've started preparing your order and will let you know as soon as it's on its way.",
  },
  order_shipped: {
    subject: (n) => `Your order #${n} is on its way`,
    title: "Your order is on its way",
    body: "Your Imarhair order has been dispatched.",
  },
  order_delivered: {
    subject: (n) => `Your order #${n} has been delivered`,
    title: "Delivered",
    body: "Your order has been delivered. We hope you love it, Queen. If anything isn't right, reply to this email and we'll help.",
  },
  order_cancelled: {
    subject: (n) => `Your order #${n} has been cancelled`,
    title: "Your order has been cancelled",
    body: "Your order has been cancelled. If you were charged, your refund will be processed and we'll confirm it by email.",
  },
  order_refunded: {
    subject: (n) => `Refund for order #${n}`,
    title: "Your refund is on its way",
    body: "We've processed a refund for your order. Depending on your bank, it can take a few working days to appear.",
  },
};

export function orderStatusEmail(
  type: StatusEmailType,
  d: Pick<OrderEmailData, "orderNumber" | "customerName" | "orderUrl" | "support" | "total"> & {
    trackingNumber: string | null;
    trackingUrl: string | null;
    note: string | null;
  },
) {
  const copy = STATUS_COPY[type];
  const firstName = d.customerName.split(" ")[0] || "Queen";
  const tracking =
    type === "order_shipped" && d.trackingNumber
      ? `<tr><td align="center" style="padding:8px 40px 0;${font}font-size:14px;color:#111111;">Tracking: ${
          d.trackingUrl ? `<a href="${esc(d.trackingUrl)}" style="color:#111111;">${esc(d.trackingNumber)}</a>` : esc(d.trackingNumber)
        }</td></tr>`
      : "";
  const note = d.note
    ? `<tr><td align="center" style="padding:12px 40px 0;${font}font-size:14px;line-height:1.6;color:#5f584f;">${esc(d.note)}</td></tr>`
    : "";
  const inner = `
<tr><td align="center" style="padding:24px 40px 4px;${serif}font-size:28px;color:#111111;">${esc(copy.title)}</td></tr>
<tr><td align="center" style="padding:8px 40px 0;${font}font-size:16px;line-height:1.6;color:#5f584f;">Hi ${esc(firstName)}, ${esc(copy.body)}</td></tr>
${tracking}${note}
<tr><td align="center" style="padding:16px 40px 0;${font}font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#111111;">Order #${esc(d.orderNumber)} · ${formatNaira(d.total)}</td></tr>
<tr><td align="center" style="padding:28px 40px 40px;">
<a href="${esc(d.orderUrl)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;${font}font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:16px 32px;border-radius:2px;">View my order</a>
</td></tr>`;
  const text = [
    copy.title,
    "",
    `Hi ${firstName}, ${copy.body}`,
    ...(type === "order_shipped" && d.trackingNumber ? [`Tracking: ${d.trackingNumber}${d.trackingUrl ? ` (${d.trackingUrl})` : ""}`] : []),
    ...(d.note ? ["", d.note] : []),
    "",
    `Order #${d.orderNumber} · ${formatNaira(d.total)}`,
    `View your order: ${d.orderUrl}`,
    "",
    `Questions? Reply to this email${d.support.email ? ` or write to ${d.support.email}` : ""}.`,
    "Imarhair Limited · Classy. Confident. IMAR.",
  ].join("\n");
  return { subject: copy.subject(d.orderNumber), html: layout(copy.title, inner, d.support), text };
}
