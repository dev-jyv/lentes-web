"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyOrders } from "@/lib/api/generated/api";
import type { OrderSummary } from "@/lib/api/generated/model";
import { formatMxn } from "@/lib/format";
import { canReorder, orderFolio, orderStatusLabel } from "@/lib/order";

const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

export function OrderHistory() {
  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ["my-orders"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await listMyOrders(pageParam ? { cursor: pageParam } : undefined);
      if (res.status !== 200) throw new Error("orders");
      return res.data;
    },
    getNextPageParam: (last) => last.next_cursor,
  });
  const items: OrderSummary[] = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError && items.length === 0) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive">No pudimos cargar tus pedidos.</p>
        <Button variant="outline" onClick={() => void refetch()}>Reintentar</Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no tienes pedidos. <Link href="/lentes" className="underline">Ver lentes</Link>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {items.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium"><span className="optic">{orderFolio(o.number)}</span> · {formatMxn(o.total_cents)}</p>
              <p className="text-xs text-muted-foreground">
                {dateFmt.format(new Date(o.created_at))} · {o.units} {o.units === 1 ? "artículo" : "artículos"}
              </p>
              {o.frame_lines.map((line, i) => (
                <p key={i} className="text-xs text-muted-foreground">{line}</p>
              ))}
              {o.tracking_number && (
                <p className="text-xs text-muted-foreground">
                  Guía {o.tracking_carrier ? `${o.tracking_carrier}: ` : ""}<span className="optic">{o.tracking_number}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={o.status === "cancelled" || o.status === "refunded" ? "destructive" : "secondary"}>
                {orderStatusLabel[o.status]}
              </Badge>
              {canReorder(o.status) && o.reorderable && (
                <Button variant="outline" size="sm" render={<Link href={`/recompra/${o.id}`} />} nativeButton={false}>
                  Volver a pedir
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {isError && <p className="text-sm text-destructive">No pudimos cargar más pedidos.</p>}
      {hasNextPage && (
        <Button variant="outline" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
          {isFetchingNextPage ? "Cargando…" : "Ver más"}
        </Button>
      )}
    </div>
  );
}
