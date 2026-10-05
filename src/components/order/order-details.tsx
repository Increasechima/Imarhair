import { ProductImage } from "@/components/product/product-image";
import { formatNaira } from "@/lib/money";
import { ORDER_STATUS_LABEL, type OrderView } from "@/lib/orders";
import { cn } from "@/lib/utils";

// Style.md §6 Status chips: tinted pill with text in the semantic colour.
const CHIP: Record<string, string> = {
  pending_payment: "bg-warning/10 text-warning",
  paid: "bg-beige text-ink",
  processing: "bg-beige text-ink",
  ready_for_dispatch: "bg-beige text-ink",
  shipped: "bg-info/10 text-info",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-error/10 text-error",
  refunded: "bg-error/10 text-error",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn("text-badge inline-flex items-center rounded-pill px-2.5 py-1", CHIP[status] ?? "bg-beige text-ink")}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OrderItems({ order }: { order: OrderView }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {order.items.map((item, i) => (
        <li key={`${item.variantId}-${i}`} className="flex gap-4 py-4">
          <div className="w-16 shrink-0">
            <ProductImage path={item.imagePath} alt="" sizes="64px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">{item.name}</p>
            {item.variantLabel && <p className="text-small text-taupe">{item.variantLabel}</p>}
            <p className="text-small text-taupe">
              Qty {item.quantity} × {formatNaira(item.unitPrice)}
            </p>
          </div>
          <p className="text-price shrink-0">{formatNaira(item.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }: { order: OrderView }) {
  const row = "text-small flex justify-between";
  return (
    <dl className="space-y-2 pt-4">
      <div className={row}>
        <dt className="text-taupe">Subtotal</dt>
        <dd className="tabular-nums">{formatNaira(order.subtotal)}</dd>
      </div>
      <div className={row}>
        <dt className="text-taupe">Delivery</dt>
        <dd className="tabular-nums">{order.deliveryFee ? formatNaira(order.deliveryFee) : "Free"}</dd>
      </div>
      {order.discount > 0 && (
        <div className={row}>
          <dt className="text-taupe">Discount</dt>
          <dd className="tabular-nums">−{formatNaira(order.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-3">
        <dt className="text-body font-medium">Total</dt>
        <dd className="text-price">{formatNaira(order.total)}</dd>
      </div>
    </dl>
  );
}

export function OrderDelivery({ order }: { order: OrderView }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div>
        <h3 className="text-label mb-3">Delivering to</h3>
        <address className="text-body not-italic text-taupe">
          {order.address.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </address>
      </div>
      <div>
        <h3 className="text-label mb-3">Delivery</h3>
        <p className="text-body text-taupe">
          {order.deliveryMethod}
          {order.deliveryEta && (
            <>
              <br />
              Estimated: {order.deliveryEta}
            </>
          )}
        </p>
        {order.trackingNumber && (
          <p className="text-body mt-3">
            Tracking:{" "}
            {order.trackingUrl ? (
              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {order.trackingNumber}
              </a>
            ) : (
              order.trackingNumber
            )}
          </p>
        )}
      </div>
    </div>
  );
}
