"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { X, ZoomIn } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { storageImageUrl } from "@/lib/catalog/images";
import type { ProductImageInfo } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

const MAIN_SIZES = "(min-width: 1024px) 58vw, 100vw";

// prd.md §6.5: large gallery, swipe on mobile, thumbnails on desktop,
// tap to open full-screen zoom (native pinch-zoom inside).
export function ProductGallery({ images, productName }: { images: ProductImageInfo[]; productName: string }) {
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const slides = images.length ? images : [{ path: "", alt: productName }];

  const goTo = (i: number) => {
    setActive(i);
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="lg:flex lg:gap-4">
      {slides.length > 1 && (
        <ul className="hidden lg:flex lg:w-20 lg:shrink-0 lg:flex-col lg:gap-3" aria-label="Product images">
          {slides.map((img, i) => (
            <li key={img.path || i}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1} of ${slides.length}`}
                aria-current={active === i}
                className={cn("block w-full border", active === i ? "border-ink" : "border-transparent hover:border-line")}
              >
                <ProductImage path={img.path} alt="" sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          ref={track}
          className="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:mx-0 [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
          aria-roledescription="carousel"
          aria-label={`${productName} images`}
        >
          {slides.map((img, i) => (
            <button
              key={img.path || i}
              type="button"
              className="w-full shrink-0 snap-center cursor-zoom-in"
              onClick={() => img.path && setZoomOpen(true)}
              aria-label={img.path ? `Zoom image ${i + 1}` : undefined}
              tabIndex={img.path ? 0 : -1}
            >
              <ProductImage path={img.path} alt={img.alt} sizes={MAIN_SIZES} preload={i === 0} />
            </button>
          ))}
        </div>

        {images.length > 0 && (
          <span className="pointer-events-none absolute right-3 bottom-3 hidden size-9 items-center justify-center bg-white/90 lg:inline-flex" aria-hidden>
            <ZoomIn className="size-4" strokeWidth={1.5} />
          </span>
        )}

        {slides.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
            {slides.map((_, i) => (
              <span key={i} className={cn("h-1 w-4 transition-colors", active === i ? "bg-ink" : "bg-line")} />
            ))}
          </div>
        )}
      </div>

      <Dialog.Root open={zoomOpen} onOpenChange={setZoomOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ivory" />
          <Dialog.Content className="fixed inset-0 z-50 overflow-auto [touch-action:pinch-zoom_pan-x_pan-y]">
            <Dialog.Title className="sr-only">{productName}</Dialog.Title>
            <Dialog.Description className="sr-only">Zoomed product image. Pinch or scroll to look closer.</Dialog.Description>
            {images[active] && (
              <div className="relative mx-auto aspect-4/5 w-full max-w-3xl lg:my-6">
                <Image
                  src={storageImageUrl(images[active].path)}
                  alt={images[active].alt}
                  fill
                  sizes="(min-width: 768px) 768px, 100vw"
                  quality={90}
                  className="object-contain"
                />
              </div>
            )}
            <Dialog.Close aria-label="Close zoom" className="fixed top-3 right-3 inline-flex size-11 items-center justify-center bg-white shadow-(--shadow-overlay)">
              <X className="size-6" strokeWidth={1.5} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
