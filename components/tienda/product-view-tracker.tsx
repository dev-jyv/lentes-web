"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function ProductViewTracker({
  slug, name, brand,
}: { slug: string; name: string; brand: string }) {
  useEffect(() => {
    track("product_viewed", { slug, name, brand });
  }, [slug, name, brand]);
  return null;
}
