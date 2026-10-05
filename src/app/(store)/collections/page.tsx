import type { Metadata } from "next";
import { CollectionTile } from "@/components/collection/collection-tile";
import { listCollections } from "@/server/queries/catalog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Collections",
  description: "Imar Classic, Imar Prime, bundles and haircare. Find the Imarhair collection made for you.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await listCollections();

  return (
    <div className="container-page py-8 lg:py-12">
      <header className="mb-8 max-w-2xl lg:mb-12">
        <p className="text-label text-taupe">Collections</p>
        <h1 className="text-h1 mt-2">Find your look</h1>
        <p className="text-body-lg mt-4 text-taupe">From everyday elegance to our finest units.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {collections.map((c) => (
          <li key={c.id}>
            <CollectionTile collection={c} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
            {c.description && <p className="text-small mt-3 text-taupe">{c.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
