"use client";

import Link from "next/link";
import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { LensConfigurator } from "@/components/tienda/lens-configurator";
import type { FrameVariant, ProductDetail } from "@/lib/api/generated/model";
import { useCatalog } from "@/components/catalog-provider";
import { formatLeadTime, formatMxn } from "@/lib/format";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

// El color elegido se comparte con la sección de características de la ficha.
const Selection = createContext<[string | undefined, (id: string) => void]>([undefined, () => {}]);

export function FrameSelection({ variants, children }: { variants: FrameVariant[]; children: ReactNode }) {
  // Se preselecciona el primer color disponible; los agotados quedan deshabilitados.
  const state = useState(() => (variants.find((v) => v.in_stock) ?? variants[0])?.id);
  return <Selection value={state}>{children}</Selection>;
}

export function SelectedColor({ variants }: { variants: FrameVariant[] }) {
  const catalog = useCatalog();
  const v = variants.find((x) => x.id === use(Selection)[0]);
  return v ? catalog.label("frame_color", v.color) : null;
}

export function FrameSelector({ product }: { product: ProductDetail }) {
  const variants = product.frame_variants;
  // Sin alto de mica suficiente la API marca el armazón como no apto para progresivos.
  const packages = useMemo(() => product.frame?.progressive_eligible === false
    ? product.lens_packages.filter((p) => p.vision_type !== "progressive")
    : product.lens_packages, [product]);
  const catalog = useCatalog();
  const colorLabel = (code: string) => catalog.label("frame_color", code);
  const [selectedId, setSelectedId] = use(Selection);
  const selected = variants.find((v) => v.id === selectedId);
  // Solo hay oferta si el precio anterior es mayor al actual.
  const onSale = !!selected && selected.compare_at_cents != null && selected.compare_at_cents > selected.price_cents;
  // Sin paquetes o sin tiempo de entrega, la venta de armazones sigue apagada.
  const canBuy = product.frame_lead_time_days != null && packages.length > 0;

  if (variants.length === 0) return <p className="text-muted-foreground">{t("frames.unavailable")}</p>;

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          {t("catalog.filters.color")}{selected && <span className="font-normal text-muted-foreground">: {colorLabel(selected.color)}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <label
              key={v.id}
              title={v.in_stock ? colorLabel(v.color) : t("frames.colorSoldOutTitle", { color: colorLabel(v.color) })}
              className={`grid size-11 place-items-center rounded-full border-2 ${v.id === selectedId ? "border-primary" : "border-transparent"} ${v.in_stock ? "cursor-pointer" : "cursor-not-allowed opacity-40"} has-focus-visible:ring-3 has-focus-visible:ring-ring/50`}
            >
              <input
                type="radio"
                name="color"
                className="sr-only"
                value={v.id}
                disabled={!v.in_stock}
                checked={v.id === selectedId}
                onChange={() => setSelectedId(v.id)}
                aria-label={v.in_stock ? colorLabel(v.color) : t("frames.colorSoldOutLabel", { color: colorLabel(v.color) })}
              />
              {/* Muestra del catálogo; sin ella (API caída) queda un círculo neutro con la etiqueta en el título. */}
              <span className="size-8 rounded-full border bg-muted" style={{ background: catalog.swatch(v.color) }} aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>

      {selected && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-lg">
          {onSale && (
            <s className="text-base text-muted-foreground">
              <span className="sr-only">{t("frames.previousPrice")} </span>
              {formatMxn(selected.compare_at_cents!)}
            </s>
          )}
          <strong className="font-display text-2xl">{formatMxn(selected.price_cents)}</strong>
          {onSale && (
            <Badge variant="destructive">{t("frames.offer")}</Badge>
          )}
          <span className="text-sm text-muted-foreground">{t("frames.frameLabel")}</span>
          <span className={`ml-1 text-sm ${selected.in_stock ? "text-good" : "text-warn"}`}>
            {selected.in_stock ? t("frames.available") : t("product.soldOut")}
          </span>
        </p>
      )}

      {canBuy ? (
        // Necesidad visual, tratamiento y receta se eligen en el panel por pasos (SPEC 17).
        <div className="space-y-3">
          <LensConfigurator product={product} packages={packages} variant={selected} onRestoreVariant={setSelectedId} />
          <p className="text-xs text-muted-foreground">
            {rich(t("frames.deliveryNote", { time: formatLeadTime(product.frame_lead_time_days!) }), {
              link: (c) => <Link href="/cambios-y-devoluciones" className="underline">{c}</Link>,
            })}
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-secondary p-4 text-sm">{t("frames.comingSoon")}</p>
      )}
    </div>
  );
}
