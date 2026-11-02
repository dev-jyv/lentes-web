"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGetOrder } from "@/lib/api/generated/api";
import { colorLabel, formatMxn } from "@/lib/format";

const FINAL = ["paid", "preparing", "shipped", "delivered", "cancelled", "refunded", "expired"];

// El estado real lo fija el webhook de Mercado Pago en el backend; aquí solo se consulta.
export function OrderStatus({ orderId }: { orderId: string }) {
  const { data, isLoading } = useGetOrder(orderId, {
    query: {
      refetchInterval: (q) => {
        const d = q.state.data;
        return d?.status === 200 && FINAL.includes(d.data.status) ? false : 3000;
      },
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Consultando tu pedido…</p>;
  if (data?.status !== 200) return <p>No encontramos este pedido.</p>;
  const o = data.data;
  const paid = ["paid", "preparing", "shipped", "delivered"].includes(o.status);
  const failed = ["cancelled", "refunded", "expired"].includes(o.status);

  return (
    <div className="space-y-4">
      {paid && (
        // Confirmación: la gota cae y el check aparece con un pequeño rebote.
        <div className="relative grid size-16 place-items-center" aria-hidden="true">
          <span className="absolute top-0 size-3 animate-drop rounded-[50%_50%_50%_0] bg-primary" />
          <span className="grid size-14 animate-pop place-items-center rounded-full bg-good text-background">
            <Check className="size-8" />
          </span>
        </div>
      )}
      <h2 className="text-2xl font-semibold">
        {paid ? "¡Gracias por tu compra!" : failed ? "Tu pago no se completó" : "Confirmando tu pago…"}
      </h2>
      <p>Pedido <strong className="optic">LC-{String(o.number).padStart(6, "0")}</strong> · {formatMxn(o.total_cents)}</p>
      {o.items.some((i) => i.category === "frame") && (
        <ul className="space-y-1 text-sm">
          {o.items.filter((i) => i.category === "frame").map((i) => (
            <li key={i.sku + (i.lens_package_name ?? "")}>
              {i.quantity}× {i.product_name}
              {i.color && ` · ${colorLabel[i.color as keyof typeof colorLabel] ?? i.color}`}
              {i.lens_package_name && ` · ${i.lens_package_name}`}
            </li>
          ))}
        </ul>
      )}
      {!paid && !failed && (
        <p className="text-sm text-muted-foreground">
          Esto puede tardar unos segundos. Si pagaste en OXXO o SPEI, se confirma cuando recibamos el pago.
        </p>
      )}
      <Button render={<Link href={paid ? "/lentes" : "/carrito"} />} nativeButton={false}>
        {paid ? "Seguir comprando" : "Volver al carrito"}
      </Button>
    </div>
  );
}
