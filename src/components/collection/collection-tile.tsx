import Image from "next/image";
import Link from "next/link";
import { storageImageUrl } from "@/lib/catalog/images";
import type { Collection } from "@/server/queries/catalog";
import { cn } from "@/lib/utils";

// Style.md §8: collection tiles are 3:4 with the name in the display serif.
// Without photography they stay typographic on a warm neutral.
export function CollectionTile({ collection, sizes, className }: { collection: Collection; sizes: string; className?: string }) {
  const comingSoon = collection.status === "coming_soon";
  const image = collection.heroImagePath;

  return (
    <Link href={`/collections/${collection.slug}`} className={cn("group block", className)}>
      <div className={cn("relative aspect-3/4 overflow-hidden", image ? "bg-sand" : comingSoon ? "bg-beige" : "bg-sand")}>
        {image && (
          <Image
            src={storageImageUrl(image)}
            alt=""
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-(--duration-slow) ease-(--ease-out) group-hover:scale-102"
          />
        )}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-end p-5 lg:p-6",
            image && "bg-[linear-gradient(transparent_50%,rgb(17_17_17/0.35))] text-white",
          )}
        >
          {comingSoon && <span className="text-label mb-2 text-gold-deep">Coming soon</span>}
          <h3 className="text-h2">{collection.name}</h3>
          <span className="text-label mt-3 inline-flex items-center gap-2 underline decoration-1 underline-offset-4 group-hover:decoration-gold">
            {comingSoon ? "Be the first to know" : "Shop now"}
          </span>
        </div>
      </div>
    </Link>
  );
}
