import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Imarhair collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

// DRAFT: written with the Nigeria Data Protection Act 2023 in mind; must be
// reviewed by Imarhair (and ideally a lawyer) before launch.
export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" updated="October 2026" draft>
      <p>
        Imarhair Limited (&ldquo;Imarhair&rdquo;, &ldquo;we&rdquo;) respects your privacy. This policy explains what personal
        data we collect when you use imarhair.com, why we collect it, and your rights under the Nigeria Data Protection Act
        2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email, phone number and password (stored securely by our authentication
          provider; we never see it). If you sign in with Google, we receive your name and email from Google.
        </li>
        <li>
          <strong>Order details:</strong> your delivery address, phone number, the items you buy and your order history.
        </li>
        <li>
          <strong>Payment details:</strong> handled by our payment partner. We receive confirmation that you paid, but never
          your card number, CVV or PIN.
        </li>
        <li>
          <strong>Your bag and wishlist</strong>, so they&rsquo;re there when you come back.
        </li>
        <li>
          <strong>Messages</strong> you send us through the contact form.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To process, deliver and support your orders (performance of a contract).</li>
        <li>To run your account and keep it secure (performance of a contract, legitimate interest).</li>
        <li>To send order updates by email (performance of a contract).</li>
        <li>To send marketing emails, only if you opt in. You can unsubscribe at any time (consent).</li>
        <li>To prevent fraud and abuse of our services (legitimate interest).</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        Only service providers who help us run the store, under contracts that protect your data: our database and
        authentication host, payment processor, email delivery provider, website host, and delivery partners (who receive your
        name, phone and address to deliver your order). We don&rsquo;t sell your data.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept as required for tax and accounting. You can ask us to delete your account at any time; we&rsquo;ll
        remove your personal data except where the law requires us to keep it.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, delete or receive a copy of your personal data, object to or restrict how we use it, and
        withdraw consent for marketing. To make a request, <Link href="/contact">contact us</Link>. You can also complain to the
        Nigeria Data Protection Commission.
      </p>

      <h2>Cookies</h2>
      <p>
        We use essential cookies and browser storage to keep you signed in and to remember your bag and wishlist. We don&rsquo;t
        use advertising cookies.
      </p>
    </ContentPage>
  );
}
