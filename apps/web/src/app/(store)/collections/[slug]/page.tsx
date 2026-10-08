import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/shop/shop-view";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { ButtonLink } from "@/components/ui/button";
import { parseShopParams } from "@imarhair/shared/catalog/shop-params";
import { getCollection } from "@/server/queries/catalog";

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const collection = await getCollection(slug);
  if (!collection) return {};
  return {
    title: collection.name,
    description: collection.description ?? `Shop the ${collection.name} collection from Imarhair.`,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const { slug } = await props.params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  if (collection.status === "coming_soon") {
    return (
      <section className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center lg:py-32">
        <p className="text-label text-gold-deep">Coming soon</p>
        <h1 className="text-display mt-4">{collection.name}</h1>
        {collection.description && <p className="text-body-lg mt-5 max-w-md text-taupe">{collection.description}</p>}
        <p className="text-body mt-10">Be the first to know when it launches.</p>
        <NewsletterForm
          className="mt-4 w-full max-w-sm"
          source="coming_soon_haircare"
          submitLabel="Notify me"
          successMessage="We’ll let you know the moment it launches."
        />
        <ButtonLink href="/shop" variant="text" className="mt-10">
          Shop hair in the meantime
        </ButtonLink>
      </section>
    );
  }

  const params = parseShopParams(await props.searchParams);

  return (
    <div className="container-page py-8 lg:py-12">
      <header className="mb-8 max-w-2xl lg:mb-10">
        <p className="text-label text-taupe">Collection</p>
        <h1 className="text-h1 mt-2">{collection.name}</h1>
        {collection.description && <p className="text-body-lg mt-3 text-taupe">{collection.description}</p>}
      </header>
      <ShopView params={params} basePath={`/collections/${collection.slug}`} collectionSlug={collection.slug} />
    </div>
  );
}
