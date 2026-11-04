"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { HomeBanner } from "@/lib/api/generated/model";
import { isInternalHref } from "@/lib/safe-next";
import { t } from "@/lib/i18n";

const STORAGE_KEY = "promo-bar-closed";
const listeners = new Set<() => void>();

function readClosed(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function PromoBar({ banner }: { banner: HomeBanner }) {
  // El cierre se recuerda por id: una promoción nueva vuelve a mostrarse.
  const closedId = useSyncExternalStore(subscribe, readClosed, () => null);
  if (closedId === banner.id) return null;

  const close = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, banner.id);
    } catch {
      // Sin almacenamiento (modo privado): no se puede recordar el cierre.
    }
    listeners.forEach((cb) => cb());
  };

  return (
    <aside aria-label={t("promo.label")} className="relative z-40 bg-band text-white">
      <div className="container-page flex min-h-10 items-center justify-between gap-2 py-1 text-sm">
        <p className="flex-1 text-center font-medium">
          {banner.title}
          {banner.cta_label && isInternalHref(banner.cta_href) && (
            <>
              {" "}
              <Link href={banner.cta_href} className="font-semibold underline underline-offset-2">
                {banner.cta_label}
              </Link>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={close}
          aria-label={t("promo.close")}
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/15"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
