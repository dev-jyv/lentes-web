"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGetCartQueryKey, useDeleteCartItem, useGetCart, useUpdateCartItem,
} from "@/lib/api/generated/api";
import type { CartItem } from "@/lib/api/generated/model";
import { colorLabel, formatMxn, productHref } from "@/lib/format";
import { t } from "@/lib/i18n";

const eyeLabel = { right: t("cart.rightEye"), left: t("cart.leftEye"), both: t("cart.bothEyes") } as const;
const sign = (n?: number | null) => (n == null ? null : n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

function describe(i: CartItem) {
  return [
    i.sphere != null && t("cart.rx.sphere", { value: sign(i.sphere) }),
    i.cylinder != null && t("cart.rx.cylinder", { value: sign(i.cylinder) }),
    i.axis != null && t("cart.rx.axis", { value: i.axis }),
    i.addition && t("cart.rx.addition", { value: i.addition }),
    t("cart.rx.baseCurve", { value: i.base_curve }),
    t("cart.rx.diameter", { value: i.diameter }),
  ].filter(Boolean).join(" · ");
}

function FrameLine({ item }: { item: CartItem }) {
  const color = item.color ? colorLabel[item.color as keyof typeof colorLabel] ?? item.color : null;
  return (
    <>
      <p className="text-sm">{color}{item.lens_package && ` · ${item.lens_package.name}`}</p>
      {item.frame_price_cents != null && item.package_price_cents != null && (
        <p className="text-xs text-muted-foreground">
          {t("cart.framePlusLenses", { frame: formatMxn(item.frame_price_cents), lenses: formatMxn(item.package_price_cents) })}
        </p>
      )}
      <Link href={productHref({ category: item.category, slug: item.product.slug })} className="text-xs text-primary underline">
        {t("cart.changeFrameOptions")}
      </Link>
    </>
  );
}

export function CartView() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetCart();
  // 200 trae el carrito actualizado; ante 409 (sin existencias) u otro error se vuelve a consultar.
  const onSuccess = (res: { status: number }) =>
    res.status === 200
      ? queryClient.setQueryData(getGetCartQueryKey(), res)
      : queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
  const update = useUpdateCartItem({ mutation: { onSuccess } });
  const remove = useDeleteCartItem({ mutation: { onSuccess } });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const cart = data?.status === 200 ? data.data : undefined;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">{t("cart.empty")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button render={<Link href="/armazones" />} nativeButton={false}>{t("common.viewFrames")}</Button>
          <Button variant="outline" render={<Link href="/lentes" />} nativeButton={false}>{t("common.viewContactLenses")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y rounded-xl border bg-card">
        {cart.items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{i.product.brand}</p>
              <p className="font-medium">{i.product.name}</p>
              {i.category === "frame" ? (
                <FrameLine item={i} />
              ) : (
                <>
                  <p className="text-sm">{eyeLabel[i.eye]}</p>
                  <p className="optic text-xs text-muted-foreground">{describe(i)}</p>
                </>
              )}
              {!i.purchasable && (
                <p role="alert" className="text-xs text-destructive">
                  {i.category === "frame"
                    ? t("cart.frameUnavailable")
                    : i.available > 0
                      ? t("cart.onlyLeft", { count: i.available })
                      : t("cart.soldOut")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" aria-label={t("cart.decrease")}
                  disabled={i.quantity <= 1 || update.isPending}
                  onClick={() => update.mutate({ id: i.id, data: { quantity: i.quantity - 1 } })}>−</Button>
                <span className="w-6 text-center text-sm">{i.quantity}</span>
                <Button variant="outline" size="sm" aria-label={t("cart.increase")}
                  disabled={i.quantity >= Math.min(12, i.available) || update.isPending}
                  onClick={() => update.mutate({ id: i.id, data: { quantity: i.quantity + 1 } })}>+</Button>
              </div>
              <span className="w-24 text-right font-medium">{formatMxn(i.line_total_cents)}</span>
              <Button variant="ghost" size="sm" disabled={remove.isPending}
                onClick={() => remove.mutate({ id: i.id })}>{t("cart.remove")}</Button>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 lg:sticky lg:top-28">
        <div className="flex justify-between">
          <span>{t("cart.subtotal")}</span>
          <strong>{formatMxn(cart.subtotal_cents)}</strong>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("cart.shippingNote")}
        </p>
        {cart.items.some((i) => !i.purchasable) ? (
          <Button className="w-full" size="lg" disabled>{t("cart.continue")}</Button>
        ) : (
          <Button className="w-full" size="lg" render={<Link href="/checkout" />} nativeButton={false}>
            {t("cart.continue")}
          </Button>
        )}
      </aside>
    </div>
  );
}
