import { publicEnv } from "@/lib/env";
import { storageImageUrl as imageUrl } from "@imarhair/shared/catalog/images";

export { PRODUCT_IMAGE_BUCKET } from "@imarhair/shared/catalog/images";

/** Public URL for an object in the product-images bucket (or a full URL as-is). */
export const storageImageUrl = (path: string): string => imageUrl(publicEnv.supabaseUrl, path);
