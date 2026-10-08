"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { addProductImage } from "@/server/actions/admin/products";

const MAX_SIDE = 2000;

/** Downscale in the browser to ≤2000px WebP (keeps uploads small on mobile data). */
async function toWebp(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("This browser couldn't process the image.");
  return { blob, width, height };
}

// Uploads straight to Supabase Storage with the admin's own session (the
// bucket policy only lets admins write), then registers the image. No large
// request bodies go through the app server (Vercel caps them at ~4.5 MB).
export function ImageUploader({ productId, productName }: { productId: string; productName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: "idle" | "busy" | "ok" | "error"; text: string }>({ tone: "idle", text: "" });

  async function upload(files: FileList) {
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 10);
    if (!list.length) return;
    const supabase = createClient();
    let done = 0;
    for (const file of list) {
      setStatus({ tone: "busy", text: `Uploading ${done + 1} of ${list.length}…` });
      try {
        const { blob, width, height } = await toWebp(file);
        const path = `products/${productId}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
        if (error) throw new Error(error.message);
        const res = await addProductImage({ productId, path, width, height, alt: productName });
        if (res.status === "error") throw new Error(res.message);
        done++;
      } catch (e) {
        setStatus({ tone: "error", text: `${file.name}: ${(e as Error).message}` });
        return;
      }
    }
    setStatus({ tone: "ok", text: `${done} image${done === 1 ? "" : "s"} added. Edit the descriptions below.` });
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-taupe bg-white p-6 text-center hover:border-ink">
        <ImagePlus className="size-6 text-taupe" strokeWidth={1.5} aria-hidden />
        <span className="text-small">
          <span className="underline underline-offset-4">Choose photos</span> (JPG, PNG or WebP, up to 10 at a time)
        </span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          disabled={status.tone === "busy"}
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
      </label>
      {status.text && (
        <p
          role={status.tone === "error" ? "alert" : "status"}
          className={status.tone === "error" ? "text-small mt-2 text-error" : status.tone === "ok" ? "text-small mt-2 text-success" : "text-small mt-2 text-taupe"}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
