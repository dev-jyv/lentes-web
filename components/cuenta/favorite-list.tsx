"use client";

import Link from "next/link";
import { ProductCard } from "@/components/tienda/product-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/lib/favorites";
import { t } from "@/lib/i18n";

// Quitar se hace con el corazón de cada tarjeta.
export function FavoriteList() {
  const { items, failed } = useFavorites();
  if (failed) return <p role="alert" className="text-destructive">{t("favorites.loadFailed")}</p>;
  if (!items) return <Skeleton className="h-64 w-full" />;
  if (!items.length) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t("favorites.empty")}</p>
        <Link href="/armazones" className={buttonVariants({ variant: "outline" })}>{t("favorites.browseFrames")}</Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map(({ product }) => (
        <li key={product.id}><ProductCard product={product} /></li>
      ))}
    </ul>
  );
}
