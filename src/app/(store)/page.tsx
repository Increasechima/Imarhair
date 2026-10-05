import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { CollectionTile } from "@/components/collection/collection-tile";
import { ProductCard } from "@/components/product/product-card";
import { ReviewsList } from "@/components/product/reviews-list";
import { getApprovedReviews, getBestSellers, getInstagramTiles, listCollections } from "@/server/queries/catalog";
import { storageImageUrl } from "@/lib/catalog/images";
import { siteConfig } from "@/lib/site";
import heroImage from "@/assets/hero-body-wave.webp";

export const revalidate = 300;

// prd.md §6.1 — sections in this order, and no more.
export default async function HomePage() {
  const [collections, bestSellers, reviews, tiles] = await Promise.all([
    listCollections(),
    getBestSellers(4),
    getApprovedReviews({ limit: 3 }),
    getInstagramTiles(),
  ]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Imarhair Limited",
      alternateName: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/icon.svg`,
      sameAs: [siteConfig.instagram.url],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteConfig.url}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {/* 1. Hero */}
      {/* Mobile: photo first, full-bleed. Desktop: copy left, portrait photo right. */}
      <section className="lg:container-page lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-12">
        <div className="relative aspect-4/5 max-h-[68svh] w-full overflow-hidden bg-sand lg:order-2 lg:col-span-6 lg:col-start-7 lg:max-h-[82svh]">
          <Image
            src={heroImage}
            alt="Long honey brown body wave unit by Imarhair"
            fill
            preload
            placeholder="blur"
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover object-top"
          />
        </div>
        <div className="container-page py-10 lg:order-1 lg:col-span-6 lg:px-0 lg:py-0">
          <p className="text-label text-taupe motion-safe:animate-[rise-in_350ms_var(--ease-out)_both]">Imarhair</p>
          <h1 className="text-display mt-4 lg:mt-6 motion-safe:animate-[rise-in_350ms_var(--ease-out)_80ms_both]">
            Classy. Confident. <span className="whitespace-nowrap">IMAR</span>
          </h1>
          <p className="text-body-lg mt-4 max-w-md text-taupe lg:mt-6 motion-safe:animate-[rise-in_350ms_var(--ease-out)_160ms_both]">
            {siteConfig.description.replace(/\.$/, "")}.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-10 motion-safe:animate-[rise-in_350ms_var(--ease-out)_240ms_both]">
            <ButtonLink href="/shop">Shop hair</ButtonLink>
            <ButtonLink href="/collections" variant="secondary">
              Explore collections
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* 2. Featured collections */}
      {collections.length > 0 && (
        <section aria-labelledby="collections-title" className="container-page pt-6 pb-16 lg:pt-20 lg:pb-28">
          <SectionHeader id="collections-title" eyebrow="Collections" title="Find your look" href="/collections" linkLabel="All collections" />
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            {collections.slice(0, 4).map((c) => (
              <li key={c.id}>
                <CollectionTile collection={c} sizes="(min-width: 1024px) 25vw, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Best sellers */}
      {bestSellers.length > 0 && (
        <section aria-labelledby="best-title" className="bg-beige py-16 lg:py-28">
          <div className="container-page">
            <SectionHeader id="best-title" eyebrow="Best sellers" title="Loved by our Queens" href="/shop?sort=best-selling" linkLabel="Shop all" />
            <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-4 lg:gap-6 [&::-webkit-scrollbar]:hidden">
              {bestSellers.map((p) => (
                <li key={p.id} className="flex w-7/10 shrink-0 snap-start sm:w-5/12 md:w-auto">
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 4. Brand */}
      <section aria-labelledby="brand-title" className="container-page py-20 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-label text-taupe">The Imarhair difference</p>
          <h2 id="brand-title" className="text-h1 mt-4">
            Hair that makes you feel confident.
          </h2>
          <p className="text-body-lg mt-6 text-taupe">
            Every Imarhair unit is made from quality human hair, chosen for softness, movement and a natural finish.
            Classic for every day, Prime for the moments that matter.
          </p>
          <ButtonLink href="/about" variant="text" className="mt-6">
            Our story
          </ButtonLink>
        </div>
      </section>

      {/* 5. Reviews — only real, approved reviews; hidden when there are none. */}
      {reviews.length > 0 && (
        <section aria-labelledby="reviews-title" className="container-page pb-20 lg:pb-32">
          <SectionHeader id="reviews-title" eyebrow="Reviews" title="From our customers" />
          <ReviewsList reviews={reviews} />
        </section>
      )}

      {/* 6. Instagram */}
      <section aria-labelledby="instagram-title" className="border-t border-line py-16 lg:py-24">
        <div className="container-page text-center">
          <p className="text-label text-taupe">Instagram</p>
          <h2 id="instagram-title" className="text-h2 mt-3">
            Follow {siteConfig.instagram.handle}
          </h2>
          {tiles.length > 0 && (
            <ul className="mt-10 grid grid-cols-3 gap-0.5 lg:grid-cols-6">
              {tiles.map((t) => (
                <li key={t.id}>
                  <a href={t.link_url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square bg-sand">
                    <Image src={storageImageUrl(t.image_path)} alt={t.alt} fill sizes="(min-width: 1024px) 16vw, 33vw" className="object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a
            href={siteConfig.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-label mt-8 inline-flex min-h-11 items-center underline decoration-1 underline-offset-4 hover:decoration-gold"
          >
            See more on Instagram
          </a>
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 lg:mb-10">
      <div>
        <p className="text-label text-taupe">{eyebrow}</p>
        <h2 id={id} className="text-h2 mt-2">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="text-label inline-flex min-h-11 shrink-0 items-center underline decoration-1 underline-offset-4 hover:decoration-gold">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
