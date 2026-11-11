"use client";

import { cn } from "cn";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { t } from "@/lib/i18n";

// El estado se lee tras hidratar: las fichas y el catálogo siguen estáticos.
export function FavoriteButton({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const { ready, ids, toggle } = useFavorites();
  const on = ids.includes(productId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t("favorites.toggle", { name })}
      disabled={!ready}
      onClick={() => toggle(productId)}
      className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-card/90 hover:bg-accent disabled:opacity-60", className)}
    >
      <Heart className={cn("size-5", on && "fill-primary text-primary")} aria-hidden="true" />
    </button>
  );
}
