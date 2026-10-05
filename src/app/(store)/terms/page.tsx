import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you shop with Imarhair.",
  alternates: { canonical: "/terms" },
};

// DRAFT: a starting point; Imarhair (ideally with a lawyer) must approve it.
export default function TermsPage() {
  return (
    <ContentPage title="Terms & Conditions" updated="October 2026" draft>
      <p>These terms apply when you use imarhair.com or buy from Imarhair Limited. By placing an order you agree to them.</p>

      <h2>Orders and prices</h2>
      <ul>
        <li>Prices are in Nigerian Naira (₦) and include any applicable taxes unless stated otherwise.</li>
        <li>
          Your order is accepted once your payment is verified and you receive an order confirmation. We may cancel and fully
          refund an order if an item becomes unavailable or a pricing error occurs.
        </li>
        <li>We hold stock for you while you pay. If payment isn&rsquo;t completed in time, the order is cancelled automatically.</li>
      </ul>

      <h2>Products</h2>
      <p>
        We describe and photograph every product as accurately as we can. Natural hair can vary slightly in shade and texture,
        and screen colours differ.
      </p>

      <h2>Delivery</h2>
      <p>
        Delivery options, prices and estimated times are shown at checkout and on our <Link href="/shipping">Shipping &amp; Delivery</Link>{" "}
        page. Estimates aren&rsquo;t guarantees, but we&rsquo;ll keep you updated.
      </p>

      <h2>Returns</h2>
      <p>
        Please see our <Link href="/returns">Returns Policy</Link>.
      </p>

      <h2>Your account</h2>
      <p>Keep your sign-in details private. You&rsquo;re responsible for activity on your account.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? <Link href="/contact">Contact us</Link>.
      </p>
    </ContentPage>
  );
}
