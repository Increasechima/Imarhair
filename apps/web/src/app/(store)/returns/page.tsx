import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Returns Policy",
  description: "Imarhair's returns and exchange policy for wigs, bundles and closures.",
  alternates: { canonical: "/returns" },
};

// DRAFT (prd.md Q8): terms below are a sensible starting point for hair
// products and must be confirmed by Imarhair before launch.
export default function ReturnsPage() {
  return (
    <ContentPage title="Returns Policy" updated="October 2026" draft intro="We want you to love your hair. If something isn't right, here's how we can help.">
      <h2>Hygiene first</h2>
      <p>
        Because wigs, bundles and closures are worn on the head, we can only accept returns of items that are{" "}
        <strong>unworn, unwashed, unaltered</strong> (lace not cut, hair not coloured, cut or styled) and in their original
        packaging with any tags and hairnets in place.
      </p>

      <h2>Change of mind</h2>
      <p>
        Contact us within <strong>[7] days</strong> of delivery. If the item meets the conditions above, we&rsquo;ll offer an
        exchange or store credit once we&rsquo;ve received and inspected it. Delivery costs aren&rsquo;t refundable.
      </p>

      <h2>Faulty or incorrect items</h2>
      <p>
        If your order arrives damaged, faulty or different from what you ordered, contact us within <strong>[48 hours]</strong>{" "}
        of delivery with your order number and photos. We&rsquo;ll arrange a replacement or refund, including delivery costs.
      </p>

      <h2>How to start a return</h2>
      <ul>
        <li>
          <Link href="/contact">Contact us</Link> with your order number and the reason.
        </li>
        <li>We&rsquo;ll confirm whether the item can be returned and how to send it.</li>
        <li>Refunds go back to your original payment method and can take a few working days to appear.</li>
      </ul>
    </ContentPage>
  );
}
