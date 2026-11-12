"use client";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ImageIcon, Loader2Icon, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGetCartQueryKey, useDeleteCartItem, useGetCart, useUpdateCartItem,
} from "@/lib/api/generated/api";
import type { Cart, CartItem } from "@/lib/api/generated/model";
import { useCatalog } from "@/components/catalog-provider";
import { formatMxn, productHref } from "@/lib/format";
import { t } from "@/lib/i18n";
import { imageSrc } from "@/lib/images";
import { rich } from "@/lib/rich";

const eyeLabel = { right: t("cart.rightEye"), left: t("cart.leftEye"), both: t("cart.bothEyes") } as const;
const sign = (n?: number | null) => (n == null ? null : n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
const MAX_QUANTITY = 12;

type Pending = { id: string; kind: "quantity" | "remove" } | null;
type Variant = "page" | "drawer";

function describe(i: CartItem) {
  return [
    i.sphere != null && t("cart.rx.sphere", { value: sign(i.sphere) }),
    i.cylinder != null && t("cart.rx.cylinder", { value: sign(i.cylinder) }),
    i.axis != null && t("cart.rx.axis", { value: i.axis }),
    i.addition && t("cart.rx.addition", { value: i.addition }),
    i.dominance && t("cart.rx.dominance", { value: i.dominance }),
    t("cart.rx.baseCurve", { value: i.base_curve }),
    t("cart.rx.diameter", { value: i.diameter }),
  ].filter(Boolean).join(" · ");
}

// Color, necesidad visual y tratamiento de una línea de armazón, con su desglose de precios vigente.
// También la usa el resumen del checkout.
export function FrameDetails({ item }: { item: CartItem }) {
  const catalog = useCatalog();
  const color = item.color ? catalog.label("frame_color", item.color) : null;
  const parts = [color, item.lens_package?.name, item.lens_treatment?.name].filter(Boolean);
  const { frame_price_cents: frame, package_price_cents: lenses, treatment_price_cents: treatment } = item;
  return (
    <>
      <p className="text-sm">{parts.join(" · ")}</p>
      {frame != null && lenses != null && (
        <p className="text-xs text-muted-foreground">
          {item.lens_treatment && treatment != null
            ? t("cart.framePlusLensesAndTreatment", {
              frame: formatMxn(frame), lenses: formatMxn(lenses), treatment: item.lens_treatment.name, price: formatMxn(treatment),
            })
            : t("cart.framePlusLenses", { frame: formatMxn(frame), lenses: formatMxn(lenses) })}
        </p>
      )}
    </>
  );
}

function FrameLine({ item }: { item: CartItem }) {
  return (
    <>
      <FrameDetails item={item} />
      <Link href={productHref({ category: item.category, slug: item.product.slug })} className="text-xs text-primary underline">
        {t("cart.changeFrameOptions")}
      </Link>
    </>
  );
}

// Sin imagen, o si no carga, queda un ícono neutro en lugar del ícono de imagen rota del navegador.
function LineImage({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <ImageIcon className="absolute inset-0 m-auto size-6 text-muted-foreground/60" aria-hidden="true" />;
  return <Image src={src} alt="" fill unoptimized sizes="80px" className="object-contain p-1.5" onError={() => setFailed(true)} />;
}

function unavailableText(i: CartItem) {
  if (i.category === "frame") return t("cart.frameUnavailable");
  return i.available > 0 && !i.on_demand ? t("cart.onlyLeft", { count: i.available }) : t("cart.soldOut");
}

function CartLine({ item: i, pending, busy, onQuantity, onRemove }: {
  item: CartItem;
  pending: Pending;
  busy: boolean;
  onQuantity: (item: CartItem, delta: 1 | -1) => void;
  onRemove: (item: CartItem) => void;
}) {
  const src = imageSrc(i.product.image_url);
  const href = productHref({ category: i.category, slug: i.product.slug });
  const updating = pending?.id === i.id && pending.kind === "quantity";
  const removing = pending?.id === i.id && pending.kind === "remove";
  return (
    <li className="flex gap-4 py-5">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative size-20 shrink-0 rounded-lg bg-secondary">
        <LineImage src={src} />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{i.product.brand}</p>
            <Link href={href} className="line-clamp-2 font-medium hover:underline">{i.product.name}</Link>
          </div>
          <button
            type="button"
            aria-label={t("cart.removeItem", { name: i.product.name })}
            aria-busy={removing}
            disabled={busy}
            onClick={() => onRemove(i)}
            className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {removing
              ? <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              : <Trash2 className="size-4" aria-hidden="true" />}
          </button>
        </div>
        {i.category === "frame" ? (
          <FrameLine item={i} />
        ) : (
          <>
            <p className="text-sm">{eyeLabel[i.eye]}</p>
            <p className="optic text-xs text-muted-foreground">{describe(i)}</p>
            {i.on_demand && <p className="text-xs text-muted-foreground">{t("cart.onDemand")}</p>}
          </>
        )}
        {!i.purchasable && <p role="alert" className="text-xs text-destructive">{unavailableText(i)}</p>}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center rounded-full border">
            <button type="button" aria-label={t("cart.decrease")}
              disabled={i.quantity <= 1 || busy}
              onClick={() => onQuantity(i, -1)}
              className="grid size-9 place-items-center rounded-full hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="grid w-8 place-items-center text-sm font-medium" aria-busy={updating}>
              {updating ? (
                <>
                  <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">{t("cart.updating")}</span>
                </>
              ) : (
                <>
                  <span className="sr-only">{t("cart.quantity")} </span>{i.quantity}
                </>
              )}
            </span>
            <button type="button" aria-label={t("cart.increase")}
              disabled={i.quantity >= Math.min(MAX_QUANTITY, i.available) || busy}
              onClick={() => onQuantity(i, 1)}
              className="grid size-9 place-items-center rounded-full hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          <span className="font-semibold">{formatMxn(i.line_total_cents)}</span>
        </div>
      </div>
    </li>
  );
}

function CartSummary({ cart }: { cart: Cart }) {
  const link = { terms: "/terminos", privacy: "/privacidad" } as const;
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-base">
        <span>{t("cart.subtotal")}</span>
        <strong>{formatMxn(cart.subtotal_cents)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">{t("cart.shippingNote")}</p>
      <p className="text-xs text-muted-foreground">
        {rich(t("cart.legalNote"), {
          terms: (c) => <Link href={link.terms} className="font-medium text-primary underline">{c}</Link>,
          privacy: (c) => <Link href={link.privacy} className="font-medium text-primary underline">{c}</Link>,
        })}
      </p>
      {cart.items.some((i) => !i.purchasable) ? (
        <Button className="w-full" size="lg" disabled>{t("cart.continue")}</Button>
      ) : (
        <Button className="w-full" size="lg" render={<Link href="/checkout" />} nativeButton={false}>
          {t("cart.continue")}
        </Button>
      )}
    </div>
  );
}

export function CartView({ variant = "page" }: { variant?: Variant }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetCart();
  // 200 trae el carrito actualizado; ante 409 (sin existencias) u otro error se vuelve a consultar.
  const onSuccess = (res: { status: number }) =>
    res.status === 200
      ? queryClient.setQueryData(getGetCartQueryKey(), res)
      : queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
  const update = useUpdateCartItem({ mutation: { onSuccess } });
  const remove = useDeleteCartItem({ mutation: { onSuccess } });
  // El ref corta los clics repetidos antes de que React vuelva a pintar; el estado dice qué renglón
  // muestra el loader. Mientras hay una operación en curso, todo el carrito queda bloqueado.
  const inFlight = useRef(false);
  const [pending, setPending] = useState<Pending>(null);

  function run(request: Promise<{ status: number; data: unknown }>, ok: string) {
    request
      .then((res) => {
        if (res.status === 200) return toast.success(ok, { id: "cart-update" });
        toast.error((res.data as { detail?: string } | undefined)?.detail ?? t("cart.updateFailed"), { id: "cart-update" });
      })
      .catch(() => {
        toast.error(t("cart.updateFailed"), { id: "cart-update" });
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      })
      .finally(() => {
        inFlight.current = false;
        setPending(null);
      });
  }

  function start(next: NonNullable<Pending>) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(next);
    return true;
  }

  function changeQuantity(item: CartItem, delta: 1 | -1) {
    if (!start({ id: item.id, kind: "quantity" })) return;
    run(update.mutateAsync({ id: item.id, data: { quantity: item.quantity + delta } }), t("cart.updated"));
  }

  function removeItem(item: CartItem) {
    if (!start({ id: item.id, kind: "remove" })) return;
    run(remove.mutateAsync({ id: item.id }), t("cart.removed"));
  }

  const drawer = variant === "drawer";
  if (isLoading) return <Skeleton className={cn("h-40", drawer ? "m-5" : "w-full")} />;
  const cart = data?.status === 200 ? data.data : undefined;
  if (!cart || cart.items.length === 0) {
    return (
      <div className={cn("space-y-4 text-center", drawer ? "px-5 py-12" : "py-10")}>
        <p className="text-muted-foreground">{t("cart.empty")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button render={<Link href="/armazones" />} nativeButton={false}>{t("common.viewFrames")}</Button>
          <Button variant="outline" render={<Link href="/lentes" />} nativeButton={false}>{t("common.viewContactLenses")}</Button>
        </div>
      </div>
    );
  }

  const lines = (
    // La graduación es dato de salud: fuera de las grabaciones de sesión.
    <ul className={cn("ph-no-capture divide-y", drawer ? "px-5" : "rounded-xl border bg-card px-5")}>
      {cart.items.map((i) => (
        <CartLine key={i.id} item={i} pending={pending} busy={pending !== null}
          onQuantity={changeQuantity} onRemove={removeItem} />
      ))}
    </ul>
  );

  if (drawer) {
    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto">{lines}</div>
        <div className="border-t bg-secondary p-5">
          <CartSummary cart={cart} />
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {lines}
      <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-36">
        <CartSummary cart={cart} />
      </aside>
    </div>
  );
}
