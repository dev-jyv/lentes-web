"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getGetCartQueryKey, reorderOrder, useGetOrder } from "@/lib/api/generated/api";
import type { UnavailableItem } from "@/lib/api/generated/model";
import { formatMxn } from "@/lib/format";

const eyeLabel = { right: "Ojo derecho", left: "Ojo izquierdo", both: "Ambos ojos" } as const;
const reasonLabel = { out_of_stock: "agotado", discontinued: "ya no se vende" } as const;
const sign = (n?: number | null) => (n == null ? null : n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

export function Reorder({ orderId }: { orderId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetOrder(orderId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<UnavailableItem[]>([]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (data?.status !== 200) {
    return <p>No encontramos este pedido. <Link href="/lentes" className="underline">Ver catálogo</Link></p>;
  }
  const order = data.data;

  async function add() {
    setBusy(true);
    setError(null);
    const res = await reorderOrder(orderId, { method: "POST" });
    if (res.status !== 200) {
      setBusy(false);
      return setError("No pudimos preparar tu carrito. Intenta de nuevo.");
    }
    await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    if (res.data.unavailable.length > 0) {
      setBusy(false);
      return setUnavailable(res.data.unavailable);
    }
    router.push("/carrito");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Vuelve a pedir tus lentes</h1>
        <p className="text-sm text-muted-foreground">
          Pedido LC-{String(order.number).padStart(6, "0")}. Los precios y la existencia se
          confirman al agregar: pueden haber cambiado.
        </p>
      </div>
      <ul className="divide-y rounded-lg border">
        {(order.items ?? []).map((i, idx) => (
          <li key={idx} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
            <div>
              <p className="font-medium">{i.product_name} <span className="text-muted-foreground">· {i.brand_name}</span></p>
              <p>{eyeLabel[i.eye]} · {i.quantity} {i.quantity === 1 ? "caja" : "cajas"}</p>
              <p className="optic text-xs text-muted-foreground">
                {[i.sphere != null && `Esf ${sign(i.sphere)}`,
                  i.cylinder != null && `Cil ${sign(i.cylinder)}`,
                  i.axis != null && `Eje ${i.axis}°`,
                  i.addition && `Add ${i.addition}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="text-muted-foreground">Antes {formatMxn(i.unit_price_cents)}</span>
          </li>
        ))}
      </ul>
      {unavailable.length > 0 && (
        <div role="alert" className="space-y-2 rounded-lg border border-destructive p-4 text-sm">
          <p className="font-medium">Algunos artículos no se pudieron agregar:</p>
          <ul className="list-disc pl-5">
            {unavailable.map((u, i) => <li key={i}>{u.product_name}: {reasonLabel[u.reason]}</li>)}
          </ul>
          <Button render={<Link href="/carrito" />} nativeButton={false}>Ir al carrito con lo disponible</Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {unavailable.length === 0 && (
        <Button size="lg" onClick={add} disabled={busy}>
          {busy ? "Agregando…" : "Agregar al carrito"}
        </Button>
      )}
    </div>
  );
}
