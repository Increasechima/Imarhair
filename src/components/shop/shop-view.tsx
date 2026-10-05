import Link from "next/link";
import { ProductGrid } from "@/components/product/product-card";
import { FilterSheetButton, FilterSidebar, SortSelect } from "@/components/shop/shop-filters";
import { ButtonLink } from "@/components/ui/button";
import { listProducts, getFacets } from "@/server/queries/catalog";
import { activeFilterCount, shopQueryString, type ShopParams } from "@/lib/catalog/shop-params";

// Shared listing for /shop, /collections/[slug] and /search (prd.md §6.3–6.4).
export async function ShopView({
  params,
  basePath,
  collectionSlug,
}: {
  params: ShopParams;
  basePath: string;
  collectionSlug?: string;
}) {
  const [{ products, total }, facets] = await Promise.all([
    listProducts(params, { collectionSlug }),
    getFacets(),
  ]);
  const lockCollection = Boolean(collectionSlug);
  const filtersOn = activeFilterCount(params, { lockCollection }) > 0;
  const filterProps = { facets, params, basePath, lockCollection };
  const clearHref = `${basePath}${shopQueryString({ q: params.q, sort: params.sort })}`;

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-3 xl:col-span-2">
        <FilterSidebar {...filterProps} />
      </div>

      <div className="lg:col-span-9 xl:col-span-10">
        <div className="mb-6 flex items-center justify-between gap-2 border-b border-line pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <FilterSheetButton {...filterProps} />
            <p className="text-small whitespace-nowrap text-taupe" aria-live="polite">
              {total} {total === 1 ? "product" : "products"}
            </p>
          </div>
          <SortSelect params={params} basePath={basePath} />
        </div>

        {products.length > 0 ? (
          <>
            <ProductGrid products={products} priorityCount={4} />
            {products.length < total && (
              <div className="mt-14 flex flex-col items-center gap-3">
                <p className="text-small text-taupe">
                  Showing {products.length} of {total}
                </p>
                <ButtonLink
                  variant="secondary"
                  href={`${basePath}${shopQueryString({ ...params, page: params.page + 1 })}`}
                  scroll={false}
                >
                  Load more
                </ButtonLink>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-h3">{params.q ? `No results for “${params.q}”` : "No hair matches those filters."}</p>
            <p className="text-body mt-2 text-taupe">
              {filtersOn ? "Try removing a filter or two." : "Try another word, or browse the collections."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {filtersOn ? (
                <ButtonLink href={clearHref} variant="secondary">
                  Clear filters
                </ButtonLink>
              ) : (
                <ButtonLink href="/shop">Shop all hair</ButtonLink>
              )}
              <Link href="/collections" className="text-label inline-flex min-h-11 items-center underline underline-offset-4">
                Explore collections
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

