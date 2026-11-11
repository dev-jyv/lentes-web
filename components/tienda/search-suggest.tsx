"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type KeyboardEvent } from "react";
import { SearchForm } from "@/components/tienda/search-form";
import { useListProducts } from "@/lib/api/generated/api";
import type { HomeBanner, Product } from "@/lib/api/generated/model";
import { formatMxn, productHref } from "@/lib/format";
import { t } from "@/lib/i18n";
import { imageSrc } from "@/lib/images";
import type { NavLink } from "@/lib/navigation";

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

type Props = {
  id: string;
  className?: string;
  chips: NavLink[];
  featured: Product[];
  recommended: HomeBanner | null;
  // En móvil solo se muestran los chips bajo el campo, sin búsqueda en vivo.
  compact?: boolean;
};

export function SearchSuggest({ id, className = "", chips, featured, recommended, compact = false }: Props) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Sin datos iniciales (API caída al cargar) el panel no se abre ni se busca en vivo.
  const enabled = chips.length > 0 || featured.length > 0 || recommended !== null;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const searching = !compact && enabled && query.length >= MIN_QUERY;
  // React Query cancela la petición anterior al cambiar `q` y solo pinta la del texto vigente.
  const live = useListProducts(
    { q: query, limit: 6 },
    { query: { enabled: searching, retry: false, placeholderData: keepPreviousData } },
  );
  const failed = live.isError || (live.data !== undefined && live.data.status !== 200);
  const results = live.data?.status === 200 ? live.data.data.items : [];
  const ready = searching && !live.isPlaceholderData && !live.isFetching;
  const products = compact ? [] : searching ? results : featured;

  const options = [...chips.map((c) => c.href), ...products.map(productHref)];
  const optionId = (i: number) => `${id}-op-${i}`;
  const panelId = `${id}-panel`;
  const expanded = open && enabled && (!compact || chips.length > 0);
  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") return close();
    if (!expanded || !options.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      // Recorre -1 (el campo) y las opciones en ciclo.
      setActive((i) => ((i + 1 + step + options.length + 1) % (options.length + 1)) - 1);
    } else if (e.key === "Enter" && active >= 0 && active < options.length) {
      e.preventDefault();
      document.getElementById(optionId(active))?.click();
    }
  }

  const option = (i: number) => ({
    id: optionId(i),
    role: "option",
    "aria-selected": active === i,
    tabIndex: -1,
    onClick: close,
  });

  return (
    <div
      className={className}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <SearchForm
        id={id}
        inputProps={{
          value,
          onChange: (e) => {
            setValue(e.target.value);
            setActive(-1);
            setOpen(true);
          },
          onKeyDown,
          role: "combobox",
          "aria-expanded": expanded,
          "aria-controls": panelId,
          "aria-autocomplete": "list",
          "aria-activedescendant": expanded && active >= 0 ? optionId(active) : undefined,
        }}
      >
        {value && (
          <button
            type="button"
            aria-label={t("search.clear")}
            onClick={() => {
              setValue("");
              document.getElementById(id)?.focus();
            }}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </SearchForm>

      <p aria-live="polite" className="sr-only">
        {ready && !failed ? t("search.resultCount", { count: results.length }) : ""}
      </p>

      <div
        hidden={!expanded}
        // Evita que el campo pierda el foco al hacer clic dentro (Safari no enfoca enlaces al hacer clic).
        onMouseDown={(e) => e.preventDefault()}
        className={compact ? "pt-3" : "absolute inset-x-0 top-full border-b bg-card shadow-lg"}
      >
        <div className={compact ? "" : "container-page flex gap-8 py-6"}>
          <div id={panelId} role="listbox" aria-label={t("search.suggestions")} className="min-w-0 flex-1 space-y-6">
            {chips.length > 0 && (
              <div role="group" aria-labelledby={`${id}-chips`} className="space-y-3">
                <p id={`${id}-chips`} className={compact ? "sr-only" : "text-sm font-semibold"}>{t("search.suggested")}</p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((c, i) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      {...option(i)}
                      className="inline-flex min-h-9 items-center rounded-full border bg-card px-4 text-sm transition-colors hover:border-primary hover:bg-accent aria-selected:border-primary aria-selected:bg-accent"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!compact && (searching || featured.length > 0) && (
              <div role="group" aria-labelledby={`${id}-products`} className="space-y-3">
                <p id={`${id}-products`} className="text-sm font-semibold">
                  {searching ? t("search.liveResults") : t("search.featured")}
                </p>
                {searching && failed ? (
                  <p className="text-sm text-muted-foreground">{t("search.unavailable")}</p>
                ) : searching && ready && !results.length ? (
                  <p className="text-sm text-muted-foreground">{t("search.noResults", { q: query })}</p>
                ) : (
                  <div className="grid grid-cols-6 gap-3">
                    {products.map((p, i) => {
                      const src = imageSrc(p.image_url);
                      return (
                        <Link
                          key={p.id}
                          href={productHref(p)}
                          {...option(chips.length + i)}
                          className="group space-y-2 rounded-xl p-2 text-sm transition-colors hover:bg-accent aria-selected:bg-accent"
                        >
                          <span className="relative block aspect-square overflow-hidden rounded-lg bg-secondary">
                            {src ? (
                              <Image src={src} alt="" fill unoptimized className="object-contain p-2" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("product.noImage")}</span>
                            )}
                          </span>
                          <span className="line-clamp-2 block leading-tight">{p.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {p.from_price_cents != null ? formatMxn(p.from_price_cents) : t("product.soldOut")}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {!compact && recommended && (
            <div className="w-56 shrink-0 space-y-3">
              <p className="text-sm font-semibold">{t("search.recommended")}</p>
              <Link href={recommended.cta_href!} onClick={close} tabIndex={-1} className="group block overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary">
                <span className="relative block aspect-[4/3] bg-secondary">
                  <Image src={imageSrc(recommended.image_url)!} alt={recommended.image_alt ?? ""} fill unoptimized className="object-cover" />
                </span>
                <span className="block p-3 font-display font-semibold">{recommended.title}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
