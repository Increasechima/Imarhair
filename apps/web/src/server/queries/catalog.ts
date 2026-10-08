import "server-only";
import { cache } from "react";
import { catalogClient } from "@/lib/supabase/catalog";
import * as q from "@imarhair/shared/catalog/queries";
import type { ShopParams } from "@imarhair/shared/catalog/shop-params";

// Public catalogue reads (anon, cacheable). The queries themselves live in
// @imarhair/shared/catalog/queries so the mobile app runs exactly the same
// ones; here they get the cached, cookie-less server client.

export type { Collection, Facets, ProductDetail, Review } from "@imarhair/shared/catalog/queries";

export const listCollections = cache(() => q.listCollections(catalogClient()));
export const getCollection = (slug: string) => q.getCollection(catalogClient(), slug);
export const getFacets = cache(() => q.getFacets(catalogClient()));
export const listProducts = (params: ShopParams, scope: { collectionSlug?: string } = {}) =>
  q.listProducts(catalogClient(), params, scope);
export const getBestSellers = cache((limit = 6) => q.getBestSellers(catalogClient(), limit));
export const getProductsByIds = (ids: string[]) => q.getProductsByIds(catalogClient(), ids);
export const getRelatedProducts = (product: { id: string; collectionSlug: string | null }, limit = 4) =>
  q.getRelatedProducts(catalogClient(), product, limit);
export const listProductSlugs = cache(() => q.listProductSlugs(catalogClient()));
export const getProductOptions = (productId: string) => q.getProductOptions(catalogClient(), productId);
export const getProduct = cache((slug: string) => q.getProduct(catalogClient(), slug));
export const getApprovedReviews = (opts: { productId?: string; limit?: number } = {}) =>
  q.getApprovedReviews(catalogClient(), opts);
export const getInstagramTiles = cache(() => q.getInstagramTiles(catalogClient()));
