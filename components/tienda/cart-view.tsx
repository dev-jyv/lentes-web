"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGetCartQueryKey, useDeleteCartItem, useGetCart, useUpdateCartItem,
} from "@/lib/api/generated/api";
import type { CartItem } from "@/lib/api/generated/model";
import { formatMxn } from "@/lib/format";

const eyeLabel = { right: "Ojo derecho", left: "Ojo izquierdo", both: "Ambos ojos" } as const;
const sign = (n?: number | null) => (n == null ? null : n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

function describe(i: CartItem) {
  return [
    i.sphere != null && `Esf ${sign(i.sphere)}`,
    i.cylinder != null && `Cil ${sign(i.cylinder)}`,
    i.axis != null && `Eje ${i.axis}°`,
    i.addition && `Add ${i.addition}`,
    `CB ${i.base_curve}`,
    `Diám ${i.diameter}`,
  ].filter(Boolean).join(" · ");
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
        <p className="text-muted-foreground">Tu carrito está vacío.</p>
        <Button render={<Link href="/lentes" />} nativeButton={false}>Ver catálogo</Button>
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
              <p className="text-sm">{eyeLabel[i.eye]}</p>
              <p className="optic text-xs text-muted-foreground">{describe(i)}</p>
              {!i.purchasable && (
                <p role="alert" className="text-xs text-destructive">
                  {i.available > 0
                    ? `Solo quedan ${i.available} en existencia.`
                    : "Agotado: quítalo para continuar."}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" aria-label="Menos"
                  disabled={i.quantity <= 1 || update.isPending}
                  onClick={() => update.mutate({ id: i.id, data: { quantity: i.quantity - 1 } })}>−</Button>
                <span className="w-6 text-center text-sm">{i.quantity}</span>
                <Button variant="outline" size="sm" aria-label="Más"
                  disabled={i.quantity >= Math.min(12, i.available) || update.isPending}
                  onClick={() => update.mutate({ id: i.id, data: { quantity: i.quantity + 1 } })}>+</Button>
              </div>
              <span className="w-24 text-right font-medium">{formatMxn(i.line_total_cents)}</span>
              <Button variant="ghost" size="sm" disabled={remove.isPending}
                onClick={() => remove.mutate({ id: i.id })}>Quitar</Button>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 lg:sticky lg:top-28">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <strong>{formatMxn(cart.subtotal_cents)}</strong>
        </div>
        <p className="text-xs text-muted-foreground">
          Envío e impuestos se confirman en el pago.
        </p>
        {cart.items.some((i) => !i.purchasable) ? (
          <Button className="w-full" size="lg" disabled>Continuar al pago</Button>
        ) : (
          <Button className="w-full" size="lg" render={<Link href="/checkout" />} nativeButton={false}>
            Continuar al pago
          </Button>
        )}
      </aside>
    </div>
  );
}
