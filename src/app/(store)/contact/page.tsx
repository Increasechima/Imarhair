import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { ContactForm } from "@/components/content/contact-form";
import { siteConfig } from "@/lib/site";
import { serverEnv } from "@/server/env";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about an order, a unit or delivery? Contact Imarhair.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const email = serverEnv.supportEmail;
  const phone = serverEnv.supportPhone;
  const whatsapp = phone ? `https://wa.me/${phone.replace(/[^\d]/g, "").replace(/^0/, "234")}` : null;

  return (
    <ContentPage title="Contact us" intro="Questions about an order, choosing a unit or delivery? We're happy to help.">
      <div className="not-prose mb-10 grid gap-4 sm:grid-cols-3">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="border border-line bg-white p-4 hover:border-ink">
            <span className="text-label text-taupe">WhatsApp</span>
            <span className="text-body mt-1 block">{phone}</span>
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="border border-line bg-white p-4 hover:border-ink">
            <span className="text-label text-taupe">Email</span>
            <span className="text-body mt-1 block break-all">{email}</span>
          </a>
        )}
        <a href={siteConfig.instagram.url} target="_blank" rel="noopener noreferrer" className="border border-line bg-white p-4 hover:border-ink">
          <span className="text-label text-taupe">Instagram</span>
          <span className="text-body mt-1 block">{siteConfig.instagram.handle}</span>
        </a>
      </div>
      <h2>Send a message</h2>
      <p>If it&rsquo;s about an order, include your order number (it starts with IMR-).</p>
      <div className="mt-6">
        <ContactForm />
      </div>
    </ContentPage>
  );
}
