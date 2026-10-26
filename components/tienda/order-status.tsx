"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGetOrder } from "@/lib/api/generated/me/me";
import { formatMxn } from "@/lib/format";

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
      <h2 className="text-2xl font-semibold">
        {paid ? "¡Gracias por tu compra!" : failed ? "Tu pago no se completó" : "Confirmando tu pago…"}
      </h2>
      <p>Pedido <strong>LC-{String(o.number).padStart(6, "0")}</strong> · {formatMxn(o.total_cents)}</p>
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
