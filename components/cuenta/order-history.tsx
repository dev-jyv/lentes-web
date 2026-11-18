"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Package, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/cuenta/order-status-badge";
import { listMyOrders } from "@/lib/api/generated/api";
import type { OrderStatus, OrderSummary } from "@/lib/api/generated/model";
import { formatMxn } from "@/lib/format";
import { canReorder, orderFolio } from "@/lib/order";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

// La API no filtra por estado: se filtra en el cliente sobre las páginas ya cargadas (SPEC 22).
const filters = {
  todos: null,
  "en-curso": ["pending_payment", "paid", "preparing", "shipped"],
  entregados: ["delivered"],
} as const satisfies Record<string, readonly OrderStatus[] | null>;
type Filter = keyof typeof filters;
const filterLabel: Record<Filter, string> = {
  todos: t("orders.filter.all"), "en-curso": t("orders.filter.active"), entregados: t("orders.filter.delivered"),
};

function OrderCard({ o }: { o: OrderSummary }) {
  const lenses = o.units - o.frame_lines.length;
  return (
    <li className="rounded-2xl border bg-card transition-colors hover:border-blue/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="optic font-medium">{orderFolio(o.number)}</span>
          <span className="text-sm text-muted-foreground">{dateFmt.format(new Date(o.created_at))}</span>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0 space-y-1 text-sm">
          {o.frame_lines.map((line, i) => <p key={i}>{line}</p>)}
          {lenses > 0 && <p>{t("orders.boxes", { count: lenses })}</p>}
          {o.tracking_number && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="size-4" aria-hidden="true" />
              {o.tracking_carrier ? t("orders.trackingWithCarrier", { carrier: o.tracking_carrier }) : t("orders.tracking")} <span className="optic">{o.tracking_number}</span>
            </p>
          )}
        </div>
        <p className="font-display text-xl">{formatMxn(o.total_cents)}</p>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        <Link href={`/cuenta/pedidos/${o.id}`} className={buttonVariants({ size: "lg", className: "px-4" })}>{t("orders.viewDetail")}</Link>
        {canReorder(o.status) && o.reorderable && (
          <Link href={`/recompra/${o.id}`} className={buttonVariants({ variant: "outline", size: "lg", className: "px-4" })}>{t("orders.reorder")}</Link>
        )}
      </div>
    </li>
  );
}

export function OrderHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current: Filter = (params.get("estado") as Filter) in filters ? (params.get("estado") as Filter) : "todos";
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
  const allowed = filters[current];
  const visible = allowed ? items.filter((o) => (allowed as readonly OrderStatus[]).includes(o.status)) : items;

  if (isLoading) {
    return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}</div>;
  }
  if (isError && items.length === 0) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive">{t("orders.loadFailed")}</p>
        <Button variant="outline" onClick={() => void refetch()}>{t("common.retry")}</Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-blue-soft text-blue"><Package className="size-7" aria-hidden="true" /></span>
        <p className="text-sm text-muted-foreground">
          {rich(t("orders.empty"), { link: (c) => <Link href="/lentes" className="font-medium text-blue underline">{c}</Link> })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label={t("orders.filterLabel")} className="flex flex-wrap gap-2">
        {(Object.keys(filters) as Filter[]).map((f) => (
          <button
            key={f} type="button" aria-pressed={current === f}
            onClick={() => router.replace(f === "todos" ? pathname : `${pathname}?estado=${f}`, { scroll: false })}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              current === f ? "border-blue bg-blue text-white" : "hover:bg-accent",
            )}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>
      {visible.length > 0
        ? <ul className="space-y-4">{visible.map((o) => <OrderCard key={o.id} o={o} />)}</ul>
        : <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("orders.filterEmpty")}</p>}
      {isError && <p className="text-sm text-destructive">{t("orders.loadMoreFailed")}</p>}
      {hasNextPage && (
        <Button variant="outline" size="lg" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
          {isFetchingNextPage ? t("common.loading") : t("common.viewMore")}
        </Button>
      )}
    </div>
  );
}
