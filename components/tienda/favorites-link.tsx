"use client";

import { Popover } from "@base-ui/react/popover";
import { Heart, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dismissFavoritesNotice, useFavorites, useFavoritesNotice } from "@/lib/favorites";
import { formatMxn, productHref } from "@/lib/format";
import { imageSrc } from "@/lib/images";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

export function FavoritesLink() {
  const [open, setOpen] = useState(false);
  const { loggedIn, count, items, loading, failed, toggle } = useFavorites({ withProducts: open });
  const notice = useFavoritesNotice();
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(dismissFavoritesNotice, 6000);
    return () => clearTimeout(id);
  }, [notice]);
  const all = loggedIn ? "/cuenta/favoritos" : `/login?next=${encodeURIComponent("/cuenta/favoritos")}`;

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          aria-label={count > 0 ? t("favorites.linkWithCount", { count }) : t("favorites.link")}
          className="relative grid size-11 place-items-center rounded-full hover:bg-accent"
        >
          <Heart className="size-6" aria-hidden="true" />
          {count > 0 && (
            <span className="optic absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-sun px-1 text-[11px] font-medium text-navy">
              {count}
            </span>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" sideOffset={8} className="z-50">
            <Popover.Popup
              className="max-h-(--available-height) w-80 overflow-y-auto rounded-xl bg-popover p-5 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none"
              onClick={(e) => (e.target as Element).closest("a") && setOpen(false)}
            >
              <div className="mb-3 flex items-center justify-between">
                <Popover.Title className="text-lg font-bold">
                  {count > 0 ? t("favorites.titleWithCount", { count }) : t("favorites.title")}
                </Popover.Title>
                <Popover.Close aria-label={t("common.close")} className="flex size-8 items-center justify-center rounded-full hover:bg-accent">
                  <X className="size-4" aria-hidden="true" />
                </Popover.Close>
              </div>
              {count === 0 ? (
                <div className="space-y-3 py-2 text-center">
                  <p className="text-sm text-muted-foreground">{t("favorites.empty")}</p>
                  <Link href="/armazones" className={buttonVariants({ variant: "outline" })}>{t("favorites.browseFrames")}</Link>
                </div>
              ) : (
                <>
                  {failed && <p role="alert" className="text-sm text-destructive">{t("favorites.loadFailed")}</p>}
                  {loading && <Skeleton className="h-16 w-full" />}
                  <ul className="divide-y">
                    {items?.slice(0, 3).map(({ product: p }) => {
                      const src = imageSrc(p.image_url);
                      return (
                        <li key={p.id} className="flex items-center gap-3 py-3">
                          <div className="relative size-16 shrink-0 rounded-lg bg-secondary">
                            {src && <Image src={src} alt="" fill unoptimized className="object-contain p-1" />}
                          </div>
                          <div className="min-w-0 flex-1 text-sm">
                            <Link href={productHref(p)} className="line-clamp-2 font-medium hover:underline">{p.name}</Link>
                            <p className="text-muted-foreground">
                              {p.from_price_cents != null
                                ? rich(t("product.fromPrice", { price: formatMxn(p.from_price_cents) }), { price: (c) => <strong className="text-foreground">{c}</strong> })
                                : t("product.soldOut")}
                            </p>
                          </div>
                          <button type="button" aria-label={t("favorites.remove", { name: p.name })} onClick={() => toggle(p.id)}
                            className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-accent">
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href={all} className={buttonVariants({ className: "mt-3 w-full" })}>{t("favorites.viewAll")}</Link>
                </>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {notice && (
        <p role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg">
          {notice}
        </p>
      )}
    </>
  );
}
