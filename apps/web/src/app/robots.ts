import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/admin", "/checkout", "/cart", "/api", "/auth", "/wishlist", "/search", "/dev"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
