import { publicEnv } from "@/lib/env";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Public URL for an object in the product-images bucket (or a full URL as-is). */
export function storageImageUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path.replace(/^\/+/, "")}`;
}
