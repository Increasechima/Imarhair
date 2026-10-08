import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { footerNav, siteConfig } from "@/lib/site";

export function Footer() {
  const supportEmail = process.env.SUPPORT_EMAIL;
  const supportPhone = process.env.SUPPORT_PHONE;

  return (
    <footer className="mt-auto bg-beige">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-12 lg:gap-8 lg:py-20">
        <div className="lg:col-span-4">
          <Wordmark className="text-2xl" />
          <p className="text-h2 mt-8 max-w-sm">New drops and restocks, first.</p>
          <NewsletterForm className="mt-6 max-w-sm" />
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-6">
          {footerNav.map((group) => (
            <div key={group.title}>
              <h2 className="text-label text-taupe">{group.title}</h2>
              <ul className="mt-4 flex flex-col">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-small inline-flex min-h-10 items-center hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="text-label text-taupe">Customer care</h2>
            <ul className="text-small mt-4 flex flex-col">
              {supportEmail && (
                <li>
                  <a href={`mailto:${supportEmail}`} className="inline-flex min-h-10 items-center hover:underline">
                    {supportEmail}
                  </a>
                </li>
              )}
              {supportPhone && (
                <li>
                  <a href={`tel:${supportPhone.replace(/\s/g, "")}`} className="inline-flex min-h-10 items-center hover:underline">
                    {supportPhone}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={siteConfig.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center hover:underline"
                >
                  Instagram {siteConfig.instagram.handle}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page text-small flex flex-col gap-2 py-6 text-taupe sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Imarhair Limited</p>
          <p>Classy. Confident. IMAR.</p>
        </div>
      </div>
    </footer>
  );
}
