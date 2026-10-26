"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGetCartQueryKey, useGetCart, useRemoveCartItem, useUpdateCartItem,
} from "@/lib/api/generated/cart/cart";
import type { CartItem } from "@/lib/api/generated/model";
import { formatMxn } from "@/lib/format";

const eyeLabel = { right: "Ojo derecho", left: "Ojo izquierdo", both: "Ambos ojos" } as const;
const sign = (n?: number | null) => (n == null ? null : n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

function describe(i: CartItem) {
  const p = i.params;
  return [
    p.sphere != null && `Esf ${sign(p.sphere)}`,
    p.cylinder != null && `Cil ${sign(p.cylinder)}`,
    p.axis != null && `Eje ${p.axis}°`,
    p.addition && `Add ${p.addition}`,
    `CB ${p.base_curve}`,
    `Diám ${p.diameter}`,
  ].filter(Boolean).join(" · ");
}

export function CartView() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetCart();
  const onSuccess = (res: unknown) => queryClient.setQueryData(getGetCartQueryKey(), res);
  const update = useUpdateCartItem({ mutation: { onSuccess } });
  const remove = useRemoveCartItem({ mutation: { onSuccess } });

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
    <div className="grid gap-8 md:grid-cols-[1fr_280px]">
      <ul className="divide-y rounded-lg border">
        {cart.items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{i.brand_name}</p>
              <p className="font-medium">{i.product_name}</p>
              <p className="text-sm">{eyeLabel[i.eye]}</p>
              <p className="text-xs text-muted-foreground">{describe(i)}</p>
              {i.available != null && i.available < i.quantity && (
                <p className="text-xs text-destructive">Solo quedan {i.available} en existencia.</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" aria-label="Menos"
                  disabled={i.quantity <= 1 || update.isPending}
                  onClick={() => update.mutate({ id: i.id, data: { quantity: i.quantity - 1 } })}>−</Button>
                <span className="w-6 text-center text-sm">{i.quantity}</span>
                <Button variant="outline" size="sm" aria-label="Más"
                  disabled={i.quantity >= 12 || update.isPending}
                  onClick={() => update.mutate({ id: i.id, data: { quantity: i.quantity + 1 } })}>+</Button>
              </div>
              <span className="w-24 text-right font-medium">{formatMxn(i.line_total_cents)}</span>
              <Button variant="ghost" size="sm" disabled={remove.isPending}
                onClick={() => remove.mutate({ id: i.id })}>Quitar</Button>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit space-y-4 rounded-lg border p-4">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <strong>{formatMxn(cart.subtotal_cents)}</strong>
        </div>
        <p className="text-xs text-muted-foreground">
          Envío e impuestos se confirman en el pago.
        </p>
        <Button className="w-full" size="lg" render={<Link href="/checkout" />} nativeButton={false}>
          Continuar al pago
        </Button>
      </aside>
    </div>
  );
}
