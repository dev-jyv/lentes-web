"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, use, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addCartItem, getGetCartQueryKey } from "@/lib/api/generated/api";
import type { FrameVariant, ProductDetail } from "@/lib/api/generated/model";
import { track } from "@/lib/analytics";
import { colorLabel, formatLeadTime, formatMxn } from "@/lib/format";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

// Muestras de color del producto: son datos del catálogo, no parte de la paleta de la marca.
const swatch: Record<FrameVariant["color"], string> = {
  black: "#1b1b1f", tortoise: "#7a4a22", brown: "#6b4226", transparent: "#e8eef0", gray: "#8a8f94", blue: "#2f5fa8",
  green: "#3f7d58", red: "#b3312f", pink: "#e39ab0", purple: "#6d4aa0", gold: "#c9a24a", silver: "#c2c7cc",
  multicolor: "conic-gradient(#b3312f, #c9a24a, #3f7d58, #2f5fa8, #b3312f)",
};

// El color elegido se comparte con la sección de características de la ficha.
const Selection = createContext<[string | undefined, (id: string) => void]>([undefined, () => {}]);

export function FrameSelection({ variants, children }: { variants: FrameVariant[]; children: ReactNode }) {
  // Se preselecciona el primer color disponible; los agotados quedan deshabilitados.
  const state = useState(() => (variants.find((v) => v.in_stock) ?? variants[0])?.id);
  return <Selection value={state}>{children}</Selection>;
}

export function SelectedColor({ variants }: { variants: FrameVariant[] }) {
  const v = variants.find((x) => x.id === use(Selection)[0]);
  return v ? colorLabel[v.color] : null;
}

export function FrameSelector({ product }: { product: ProductDetail }) {
  const variants = product.frame_variants;
  // Sin alto de mica suficiente la API marca el armazón como no apto para progresivos.
  const packages = product.frame?.progressive_eligible === false
    ? product.lens_packages.filter((p) => p.vision_type !== "progressive")
    : product.lens_packages;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = use(Selection);
  const [packageId, setPackageId] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = variants.find((v) => v.id === selectedId);
  const pack = packages.find((p) => p.id === packageId);
  // Solo hay oferta si el precio anterior es mayor al actual.
  const onSale = !!selected && selected.compare_at_cents != null && selected.compare_at_cents > selected.price_cents;
  // Sin paquetes o sin tiempo de entrega, la venta de armazones sigue apagada.
  const canBuy = product.frame_lead_time_days != null && packages.length > 0;

  if (variants.length === 0) return <p className="text-muted-foreground">{t("frames.unavailable")}</p>;

  async function add() {
    if (!selected || !pack) return;
    setAdding(true);
    setError(null);
    const res = await addCartItem({ variant_id: selected.id, eye: "both", quantity: 1, lens_package_id: pack.id }).catch(() => null);
    await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    if (res?.status !== 201) {
      setAdding(false);
      const detail = (res?.data as { detail?: string } | undefined)?.detail;
      return setError(res?.status === 409 && detail ? detail : t("frames.addFailed"));
    }
    track("add_to_cart", { slug: product.slug, name: product.name, category: "frame", lens_package: pack.slug });
    router.push("/carrito");
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          {t("catalog.filters.color")}{selected && <span className="font-normal text-muted-foreground">: {colorLabel[selected.color]}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <label
              key={v.id}
              title={v.in_stock ? colorLabel[v.color] : t("frames.colorSoldOutTitle", { color: colorLabel[v.color] })}
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
                aria-label={v.in_stock ? colorLabel[v.color] : t("frames.colorSoldOutLabel", { color: colorLabel[v.color] })}
              />
              <span className="size-8 rounded-full border" style={{ background: swatch[v.color] }} aria-hidden="true" />
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
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("frames.chooseLenses")}</legend>
            <div className="space-y-2">
              {packages.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border bg-card p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <span className="flex items-start gap-3">
                    <input type="radio" name="micas" className="mt-1" value={p.id} checked={packageId === p.id} onChange={() => setPackageId(p.id)} />
                    <span>
                      <strong>{p.name}</strong>
                      {p.description && <span className="block text-muted-foreground">{p.description}</span>}
                      {p.requires_prescription && <span className="block text-xs text-muted-foreground">{t("frames.requiresPrescription")}</span>}
                    </span>
                  </span>
                  <strong className="shrink-0">{p.price_cents === 0 ? t("frames.included") : t("frames.packagePrice", { price: formatMxn(p.price_cents) })}</strong>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="flex justify-between">
              <span>{t("frames.total")}</span>
              <strong className="font-display text-xl">
                {selected && pack ? formatMxn(selected.price_cents + pack.price_cents) : t("frames.chooseLenses")}
              </strong>
            </p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button size="lg" className="w-full" disabled={!selected?.in_stock || !pack || adding} onClick={add}>
              {adding ? t("frames.adding") : t("frames.addToCart")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {rich(t("frames.deliveryNote", { time: formatLeadTime(product.frame_lead_time_days!) }), {
                link: (c) => <Link href="/cambios-y-devoluciones" className="underline">{c}</Link>,
              })}
            </p>
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-secondary p-4 text-sm">{t("frames.comingSoon")}</p>
      )}
    </div>
  );
}
