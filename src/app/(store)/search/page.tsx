import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ShopView } from "@/components/shop/shop-view";
import { parseShopParams } from "@/lib/catalog/shop-params";
import { listCollections } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage(props: PageProps<"/search">) {
  const params = parseShopParams(await props.searchParams);
  const collections = params.q ? [] : (await listCollections()).filter((c) => c.status === "active");

  return (
    <div className="container-page py-8 lg:py-12">
      <form action="/search" role="search" className="mx-auto mb-10 max-w-xl lg:mb-14">
        <label htmlFor="search-q" className="text-label text-taupe">
          Search Imarhair
        </label>
        <div className="mt-3 flex items-center border-b border-ink">
          <Search className="size-5 shrink-0 text-taupe" strokeWidth={1.5} aria-hidden />
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Bob, body wave, Imar Prime…"
            autoFocus={!params.q}
            autoComplete="off"
            enterKeyHint="search"
            className="h-14 min-w-0 flex-1 bg-transparent px-3 text-lg placeholder:text-stone focus:outline-none"
          />
          <button type="submit" className="text-label min-h-11 px-2">
            Search
          </button>
        </div>
      </form>

      {params.q ? (
        <>
          <h1 className="text-h2 mb-8">Results for “{params.q}”</h1>
          <ShopView params={params} basePath="/search" />
        </>
      ) : (
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-h2">What are you looking for?</h1>
          <p className="text-body mt-3 text-taupe">Search by name, texture or length, or start with a collection.</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {collections.map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="text-small inline-flex h-11 items-center border border-line bg-white px-4 hover:border-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
