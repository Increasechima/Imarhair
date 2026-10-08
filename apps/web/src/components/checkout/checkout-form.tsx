"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormMessage, SelectField } from "@/components/ui/field";
import { ProductImage } from "@/components/product/product-image";
import { formatNaira } from "@imarhair/shared/money";
import { deliveryZoneFor, NIGERIAN_STATES } from "@imarhair/shared/ng-states";
import { checkoutSchema, COUNTRIES } from "@imarhair/shared/validation/checkout";
import { fieldErrors, type FieldErrors } from "@imarhair/shared/validation/auth";
import { ISSUE_MESSAGE } from "@imarhair/shared/orders";
import { placeOrderAction, quoteCheckout, type CheckoutQuote } from "@/server/actions/checkout";
import { cn } from "@/lib/utils";

export type DeliveryOption = {
  code: string;
  name: string;
  description: string | null;
  rates: { zone: string; price: number; etaMin: number; etaMax: number }[];
};

export type SavedAddress = {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
};

type Values = {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  deliveryMethod: string;
  saveAddress: boolean;
};

const STATE_OPTIONS = NIGERIAN_STATES.map((s) => ({ value: s, label: s }));
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
const etaText = (min: number, max: number) => (max <= 1 ? "Same or next working day" : `${min}–${max} working days`);

// prd.md §6.11 — one page: contact, address, delivery, payment, summary, PAY NOW.
export function CheckoutForm({
  methods,
  account,
  addresses,
  paymentProvider,
}: {
  methods: DeliveryOption[];
  account: { email: string; fullName: string; phone: string } | null;
  addresses: SavedAddress[];
  paymentProvider: "paystack" | "mock";
}) {
  const { lines, view, signedIn, refresh } = useCart();
  const saved = addresses[0];
  const [addressId, setAddressId] = useState<string | "new">(saved ? saved.id : "new");
  const [values, setValues] = useState<Values>({
    fullName: saved?.full_name ?? account?.fullName ?? "",
    email: account?.email ?? "",
    phone: saved?.phone ?? account?.phone ?? "",
    line1: saved?.line1 ?? "",
    line2: saved?.line2 ?? "",
    city: saved?.city ?? "",
    state: saved?.state ?? "",
    country: saved?.country ?? "NG",
    deliveryMethod: methods[0]?.code ?? "standard",
    saveAddress: Boolean(account) && addresses.length === 0,
  });
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const linesKey = lines.map((l) => `${l.variantId}:${l.quantity}`).join("|");
  const zone = deliveryZoneFor(values.country, values.state);

  // Live, server-computed summary (the same SQL that prices the order).
  useEffect(() => {
    if (signedIn === null || !linesKey) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await quoteCheckout(
        { country: values.country, state: values.state, deliveryMethod: values.deliveryMethod, discountCode: appliedCode },
        signedIn ? undefined : linesKey.split("|").map((p) => {
          const [variant_id, q] = p.split(":");
          return { variant_id, quantity: Number(q) };
        }),
      );
      if (cancelled) return;
      if (res.ok) {
        setQuote(res.data);
        setQuoteError(null);
      } else {
        setQuoteError(res.error);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [signedIn, linesKey, values.country, values.state, values.deliveryMethod, appliedCode]);

  const summaryLines = quote?.view.lines ?? view?.lines ?? [];
  const issues = quote?.issues ?? view?.issues ?? 0;

  function chooseAddress(id: string) {
    setAddressId(id);
    const a = addresses.find((x) => x.id === id);
    setValues((v) =>
      a
        ? { ...v, fullName: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, country: a.country, saveAddress: false }
        : { ...v, line1: "", line2: "", city: "", state: "", saveAddress: true },
    );
    setErrors({});
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const input = { ...values, discountCode: appliedCode };
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError("Please check the highlighted fields.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setSubmitting(true);
    const res = await placeOrderAction(
      input,
      signedIn ? undefined : lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
    );
    if (res.status === "redirect") {
      window.location.assign(res.url); // to the payment page — keep the button busy
      return;
    }
    setSubmitting(false);
    setErrors(res.fieldErrors ?? {});
    setFormError(res.message);
    if (res.stockChanged) void refresh();
  }

  if (view && view.lines.length === 0 && !submitting) {
    return (
      <div className="py-16 text-center">
        <p className="text-h3">Your bag is empty.</p>
        <ButtonLink href="/shop" className="mt-8">
          Shop hair
        </ButtonLink>
      </div>
    );
  }

  const total = quote?.total ?? view?.subtotal ?? 0;
  const section = "border-t border-line pt-8";
  const heading = "text-label mb-5 flex items-center gap-3";
  const step = (n: number) => <span className="inline-flex size-6 items-center justify-center rounded-pill border border-ink text-badge">{n}</span>;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
      {/* Order summary: collapsible on mobile, sticky column on desktop */}
      <aside className="mb-8 lg:order-2 lg:col-span-5 lg:mb-0 lg:sticky lg:top-28">
        <details className="group border border-line bg-white lg:hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4">
            <span className="text-label">
              <span className="group-open:hidden">Show order summary</span>
              <span className="hidden group-open:inline">Hide order summary</span>
            </span>
            <span className="text-price">{formatNaira(total)}</span>
          </summary>
          <OrderSummary quote={quote} lines={summaryLines} subtotal={view?.subtotal ?? 0} />
        </details>
        <div className="hidden border border-line bg-white lg:block">
          <p className="text-label flex min-h-14 items-center px-6">Order summary</p>
          <OrderSummary quote={quote} lines={summaryLines} subtotal={view?.subtotal ?? 0} />
        </div>
      </aside>

      <div className="flex flex-col gap-10 lg:order-1 lg:col-span-7">
        {!account && (
          <p className="text-small text-taupe">
            Have an account?{" "}
            <Link href="/login?next=/checkout" className="text-ink underline underline-offset-4">
              Sign in
            </Link>{" "}
            for faster checkout. Or continue as a guest.
          </p>
        )}

        {formError && <FormMessage tone="error">{formError}</FormMessage>}
        {quoteError && <FormMessage tone="error">{quoteError}</FormMessage>}

        <section aria-labelledby="contact-h">
          <h2 id="contact-h" className={heading}>
            {step(1)} Contact
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="fullName" autoComplete="name" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} error={errors.fullName} className="sm:col-span-2" />
            <Field
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              readOnly={Boolean(account)}
              onChange={(e) => set("email", e.target.value)}
              error={errors.email}
              hint={account ? "Your order confirmation goes here." : "For your order confirmation."}
            />
            <Field label="Phone number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" value={values.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
          </div>
        </section>

        <section aria-labelledby="address-h" className={section}>
          <h2 id="address-h" className={heading}>
            {step(2)} Delivery address
          </h2>
          {addresses.length > 0 && (
            <fieldset className="mb-6">
              <legend className="sr-only">Saved addresses</legend>
              <div className="flex flex-col gap-2">
                {addresses.map((a) => (
                  <label key={a.id} className={cn("text-small flex cursor-pointer items-start gap-3 border bg-white p-4", addressId === a.id ? "border-ink" : "border-line")}>
                    <input type="radio" name="savedAddress" className="mt-0.5 size-4 accent-ink" checked={addressId === a.id} onChange={() => chooseAddress(a.id)} />
                    <span>
                      <span className="font-medium">{a.full_name}</span>
                      <br />
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state}
                    </span>
                  </label>
                ))}
                <label className={cn("text-small flex cursor-pointer items-center gap-3 border bg-white p-4", addressId === "new" ? "border-ink" : "border-line")}>
                  <input type="radio" name="savedAddress" className="size-4 accent-ink" checked={addressId === "new"} onChange={() => chooseAddress("new")} />
                  Use a new address
                </label>
              </div>
            </fieldset>
          )}

          <div className={cn("grid gap-5 sm:grid-cols-2", addressId !== "new" && addresses.length > 0 && "hidden")}>
            <Field label="Street address" name="line1" autoComplete="address-line1" value={values.line1} onChange={(e) => set("line1", e.target.value)} error={errors.line1} className="sm:col-span-2" />
            <Field label="Apartment, landmark (optional)" name="line2" autoComplete="address-line2" value={values.line2} onChange={(e) => set("line2", e.target.value)} error={errors.line2} className="sm:col-span-2" />
            <Field label="City / town" name="city" autoComplete="address-level2" value={values.city} onChange={(e) => set("city", e.target.value)} error={errors.city} />
            {values.country === "NG" ? (
              <SelectField label="State" name="state" autoComplete="address-level1" value={values.state} onChange={(e) => set("state", e.target.value)} options={STATE_OPTIONS} placeholder="Choose your state" error={errors.state} />
            ) : (
              <Field label="State / region" name="state" autoComplete="address-level1" value={values.state} onChange={(e) => set("state", e.target.value)} error={errors.state} />
            )}
            <SelectField
              label="Country"
              name="country"
              autoComplete="country"
              value={values.country}
              onChange={(e) => setValues((v) => ({ ...v, country: e.target.value, state: "" }))}
              options={COUNTRY_OPTIONS}
              error={errors.country}
              className="sm:col-span-2"
            />
            {account && addressId === "new" && (
              <label className="text-small flex min-h-11 cursor-pointer items-center gap-3 sm:col-span-2">
                <input type="checkbox" className="size-5 accent-ink" checked={values.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)} />
                Save this address for next time
              </label>
            )}
          </div>
        </section>

        <section aria-labelledby="delivery-h" className={section}>
          <h2 id="delivery-h" className={heading}>
            {step(3)} Delivery method
          </h2>
          <fieldset>
            <legend className="sr-only">Delivery method</legend>
            <div className="flex flex-col gap-2">
              {methods.map((m) => {
                const rate = m.rates.find((r) => r.zone === zone);
                if (!rate) return null;
                const selected = values.deliveryMethod === m.code;
                return (
                  <label key={m.code} className={cn("flex cursor-pointer items-start gap-3 border bg-white p-4", selected ? "border-ink" : "border-line")}>
                    <input type="radio" name="deliveryMethod" className="mt-1 size-4 accent-ink" checked={selected} onChange={() => set("deliveryMethod", m.code)} />
                    <span className="flex-1">
                      <span className="text-body block font-medium">{m.name}</span>
                      <span className="text-small text-taupe">{etaText(rate.etaMin, rate.etaMax)}</span>
                    </span>
                    <span className="text-price">{formatNaira(rate.price)}</span>
                  </label>
                );
              })}
            </div>
            {errors.deliveryMethod && <p className="text-small mt-2 text-error">{errors.deliveryMethod}</p>}
          </fieldset>

          <div className="mt-6">
            {!codeOpen && !appliedCode ? (
              <button type="button" onClick={() => setCodeOpen(true)} className="text-small inline-flex min-h-11 items-center underline underline-offset-4">
                Have a discount code?
              </button>
            ) : (
              <div className="flex items-end gap-3">
                <Field
                  label="Discount code"
                  name="discountCode"
                  autoComplete="off"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  error={
                    errors.discountCode ??
                    (appliedCode && quote?.discountError === "invalid"
                      ? "This code isn't valid."
                      : appliedCode && quote?.discountError === "min_subtotal"
                        ? `Spend ${formatNaira(quote.discountMinSubtotal ?? 0)} or more to use this code.`
                        : undefined)
                  }
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={() => setAppliedCode(codeInput.trim())} className="shrink-0">
                  Apply
                </Button>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="pay-h" className={section}>
          <h2 id="pay-h" className={heading}>
            {step(4)} Payment
          </h2>
          <p className="text-body flex items-start gap-3 text-taupe">
            <Lock className="mt-1 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            {paymentProvider === "mock"
              ? "Development mode: a test payment page opens next. No real money is taken."
              : "You'll pay securely with Paystack by card, bank transfer or USSD. We never see or store your card details."}
          </p>
          {issues > 0 && (
            <p role="alert" className="text-small mt-6 text-error">
              Some items in your bag need attention.{" "}
              <Link href="/cart" className="underline underline-offset-4">
                Review your bag
              </Link>
            </p>
          )}
          <Button type="submit" size="lg" fullWidth className="mt-8" loading={submitting} disabled={issues > 0 || !quote}>
            {quote ? `Pay ${formatNaira(quote.total)}` : "Pay now"}
          </Button>
          <p className="text-small mt-4 text-center text-taupe">
            By placing your order you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/returns" className="underline underline-offset-4">
              Returns Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </form>
  );
}

function OrderSummary({
  quote,
  lines,
  subtotal,
}: {
  quote: CheckoutQuote | null;
  lines: CheckoutQuote["view"]["lines"];
  subtotal: number;
}) {
  const rows = useMemo(
    () => [
      { label: "Subtotal", value: formatNaira(quote?.subtotal ?? subtotal) },
      {
        label: "Delivery",
        value: quote?.deliveryName ? (quote.deliveryFee ? formatNaira(quote.deliveryFee) : "Free") : "Choose an option",
      },
      ...(quote?.discount ? [{ label: "Discount", value: `−${formatNaira(quote.discount)}` }] : []),
    ],
    [quote, subtotal],
  );
  return (
    <div className="border-t border-line px-4 pb-5 lg:px-6">
      <ul className="divide-y divide-line">
        {lines.map((l) => (
          <li key={l.variantId} className="flex gap-3 py-4">
            <div className="relative w-14 shrink-0">
              <ProductImage path={l.imagePath} alt="" sizes="56px" />
              <span className="text-badge absolute -top-2 -right-2 inline-flex size-5 items-center justify-center rounded-pill bg-ink tracking-normal text-white">{l.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-small font-medium">{l.productName ?? "Unavailable item"}</p>
              {l.variantLabel && <p className="text-small text-taupe">{l.variantLabel}</p>}
              {l.issue && <p className="text-small text-error">{ISSUE_MESSAGE[l.issue](l.available)}</p>}
            </div>
            <p className="text-small shrink-0 tabular-nums">{l.unitPrice != null ? formatNaira(l.lineTotal) : "—"}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-line pt-4">
        {rows.map((r) => (
          <div key={r.label} className="text-small flex justify-between">
            <dt className="text-taupe">{r.label}</dt>
            <dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-line pt-3">
          <dt className="text-body font-medium">Total</dt>
          <dd className="text-price">{formatNaira(quote?.total ?? subtotal)}</dd>
        </div>
        {quote?.deliveryEta && <p className="text-small text-taupe">Estimated delivery: {quote.deliveryEta}</p>}
      </dl>
    </div>
  );
}
