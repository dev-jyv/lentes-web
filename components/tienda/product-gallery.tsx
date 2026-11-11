"use client";

import Image from "next/image";
import { useState } from "react";
import { t } from "@/lib/i18n";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const view = (i: number) => (i === 0 ? alt : t("product.imageView", { name: alt, view: i + 1 }));

  return (
    <div className="space-y-3">
      <div className="relative aspect-square animate-iris overflow-hidden rounded-2xl bg-secondary">
        {images[current] ? (
          <Image src={images[current]} alt={view(current)} fill unoptimized preload className="object-contain p-8" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("product.noImage")}</div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                aria-pressed={i === current}
                onClick={() => setCurrent(i)}
                className="relative block aspect-square w-full overflow-hidden rounded-xl border-2 border-transparent bg-secondary aria-pressed:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Image src={src} alt={view(i)} fill unoptimized className="object-contain p-2" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
