import Image from "next/image";
import { Wordmark } from "@/components/brand/logo";
import { storageImageUrl } from "@/lib/catalog/images";
import { cn } from "@/lib/utils";

// 4:5 product image (Style.md §8). Until real photography is uploaded, a calm
// branded placeholder keeps every grid consistent.
export function ProductImage({
  path,
  alt,
  sizes,
  priority = false,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("@container relative aspect-4/5 overflow-hidden bg-sand", className)}>
      {path ? (
        <Image
          src={storageImageUrl(path)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" role="img" aria-label={alt}>
          {/* Scales with the frame: readable on a PDP, tiny in a toast thumbnail. */}
          <Wordmark className="text-[clamp(0.375rem,9cqw,1.5rem)] text-stone/70" />
        </div>
      )}
    </div>
  );
}
