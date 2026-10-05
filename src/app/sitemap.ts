import type { MetadataRoute } from "next";
import { listCollections, listProductSlugs } from "@/server/queries/catalog";
import { siteConfig } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const [products, collections] = await Promise.all([listProductSlugs(), listCollections()]);

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/collections`, changeFrequency: "weekly", priority: 0.8 },
    ...collections.map((c) => ({
      url: `${base}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/shop/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...["about", "contact", "faq", "shipping", "returns", "privacy", "terms"].map((page) => ({
      url: `${base}/${page}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}
