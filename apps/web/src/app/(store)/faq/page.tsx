import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about ordering, payment, delivery, returns and caring for your Imarhair unit.",
  alternates: { canonical: "/faq" },
};

const FAQS: { group: string; items: { q: string; a: ReactNode }[] }[] = [
  {
    group: "Ordering & payment",
    items: [
      {
        q: "Do I need an account to order?",
        a: "No. You can check out as a guest. An account lets you track orders, save addresses and keep your bag across devices.",
      },
      {
        q: "How can I pay?",
        a: "Pay securely through our payment partner by card, bank transfer or USSD. We never see or store your card details.",
      },
      {
        q: "When is my order confirmed?",
        a: "As soon as your payment is verified you'll see an order confirmation page and receive an email with your order number (it starts with IMR-).",
      },
    ],
  },
  {
    group: "Delivery",
    items: [
      {
        q: "How much is delivery and how long does it take?",
        a: (
          <>
            It depends on where you are and the option you choose at checkout. See{" "}
            <Link href="/shipping">Shipping &amp; Delivery</Link> for current prices and times.
          </>
        ),
      },
      {
        q: "Can I track my order?",
        a: (
          <>
            Yes. We email you when your order ships, with tracking where available. Signed-in customers can also see it under{" "}
            <Link href="/account/orders">My orders</Link>.
          </>
        ),
      },
    ],
  },
  {
    group: "Our hair",
    items: [
      {
        q: "What's the difference between Imar Classic and Imar Prime?",
        a: "Imar Classic units are made for everyday wear. Imar Prime is our finest line, with fuller density and premium lace. Each product page lists the exact hair, length, density and lace.",
      },
      {
        q: "What does density (e.g. 300g) mean?",
        a: "It's how much hair is in the unit. A higher weight gives a fuller look. Each product shows its density, and some units come in more than one.",
      },
      {
        q: "How do I care for my unit?",
        a: "Wash with sulphate-free products, detangle gently from the ends up and use low heat with a heat protectant. Each product page has care notes for that texture.",
      },
    ],
  },
  {
    group: "Returns",
    items: [
      {
        q: "Can I return a wig?",
        a: (
          <>
            For hygiene reasons, there are conditions on returns. Please read our <Link href="/returns">Returns Policy</Link> before
            ordering, and contact us if anything isn&rsquo;t right.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <ContentPage title="Frequently asked questions" intro="Can't find your answer? Contact us and we'll help.">
      {FAQS.map((section) => (
        <section key={section.group}>
          <h2>{section.group}</h2>
          <div className="border-t border-line">
            {section.items.map((item) => (
              <details key={item.q} className="group border-b border-line">
                <summary className="text-body flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium text-ink">
                  {item.q}
                  <Plus className="size-4 shrink-0 transition-transform duration-(--duration-base) group-open:rotate-45" strokeWidth={1.5} aria-hidden />
                </summary>
                <p className="pb-5">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </ContentPage>
  );
}
