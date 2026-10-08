import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/product-gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ProductAccordion } from "@/components/product/product-accordion";
import { ReviewsList, Stars } from "@/components/product/reviews-list";
import { ProductGrid } from "@/components/product/product-card";
import { getApprovedReviews, getProduct, getRelatedProducts, listProductSlugs } from "@/server/queries/catalog";
import { storageImageUrl } from "@/lib/catalog/images";
import { siteConfig } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listProductSlugs();
  return slugs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return {};
  const description =
    product.description?.slice(0, 155) ?? `${product.name} from Imarhair. Premium hair, delivered across Nigeria.`;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/shop/${product.slug}`,
      images: image ? [{ url: storageImageUrl(image.path), alt: image.alt }] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/shop/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [reviews, related] = await Promise.all([
    getApprovedReviews({ productId: product.id, limit: 12 }),
    getRelatedProducts({ id: product.id, collectionSlug: product.collectionSlug }),
  ]);
  const comingSoon = product.collectionStatus === "coming_soon";
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const accordion = [
    product.details.length > 0 && {
      id: "details",
      title: "Product details",
      content: (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {product.details.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    product.care && { id: "care", title: "Care", content: <p>{product.care}</p> },
    {
      id: "shipping",
      title: "Shipping & returns",
      content: (
        <p>
          Delivery across Nigeria, with standard and express options at checkout. See{" "}
          <Link href="/shipping" className="text-ink underline underline-offset-4">
            Shipping &amp; Delivery
          </Link>{" "}
          and our{" "}
          <Link href="/returns" className="text-ink underline underline-offset-4">
            Returns Policy
          </Link>
          .
        </p>
      ),
    },
  ].filter((x): x is { id: string; title: string; content: React.ReactElement } => Boolean(x));

  const prices = product.variants.map((v) => v.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: siteConfig.name },
    image: product.images.map((i) => storageImageUrl(i.path)),
    url: `${siteConfig.url}/shop/${product.slug}`,
    offers: prices.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "NGN",
          lowPrice: (Math.min(...prices) / 100).toFixed(2),
          highPrice: (Math.max(...prices) / 100).toFixed(2),
          offerCount: product.variants.length,
          availability: product.variants.some((v) => v.available > 0)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : undefined,
    // Only from real, approved reviews (prd.md §6.5).
    aggregateRating: avgRating
      ? { "@type": "AggregateRating", ratingValue: avgRating.toFixed(1), reviewCount: reviews.length }
      : undefined,
  };

  return (
    <article className="container-page pt-4 pb-28 lg:pt-8 lg:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="text-small mb-4 text-taupe lg:mb-6">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/shop" className="hover:underline">
              Shop
            </Link>
          </li>
          {product.collectionSlug && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/collections/${product.collectionSlug}`} className="hover:underline">
                  {product.collectionName}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            {product.collectionName && <p className="text-label text-taupe">{product.collectionName}</p>}
            <h1 className="text-h1 mt-2">{product.name}</h1>
            {avgRating && (
              <a href="#reviews" className="text-small mt-3 inline-flex items-center gap-2 text-taupe">
                <Stars rating={Math.round(avgRating)} /> {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </a>
            )}
            {product.description && <p className="text-body mt-4 text-taupe">{product.description}</p>}

            <div className="mt-8">
              <PurchasePanel
                productId={product.id}
                productName={product.name}
                imagePath={product.images[0]?.path ?? null}
                variants={product.variants}
                comingSoon={comingSoon}
              />
            </div>

            <div className="mt-10">
              <ProductAccordion items={accordion} />
            </div>
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <section id="reviews" aria-labelledby="reviews-title" className="mt-20 lg:mt-28">
          <h2 id="reviews-title" className="text-h2 mb-8">
            Reviews
          </h2>
          <ReviewsList reviews={reviews} />
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-20 lg:mt-28">
          <h2 id="related-title" className="text-h2 mb-8">
            You may also like
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </article>
  );
}
