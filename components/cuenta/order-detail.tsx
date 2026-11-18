"use client";

import { cn } from "cn";
import { ArrowLeft, Check, Copy, Info, Truck } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/cuenta/order-status-badge";
import { useGetOrder } from "@/lib/api/generated/api";
import type { Order, OrderItem } from "@/lib/api/generated/model";
import { formatMxn, productHref } from "@/lib/format";
import { canReorder, orderFolio, orderProgress } from "@/lib/order";
import { t } from "@/lib/i18n";

const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
const sign = (n?: number | null) => (n == null ? null : n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
const steps = ["paid", "preparing", "shipped", "delivered"] as const;
const canCopy = () => typeof navigator !== "undefined" && !!navigator.clipboard;

function optics(i: OrderItem) {
  return [
    i.sphere != null && t("cart.rx.sphere", { value: sign(i.sphere) }),
    i.cylinder != null && t("cart.rx.cylinder", { value: sign(i.cylinder) }),
    i.axis != null && t("cart.rx.axis", { value: i.axis }),
    i.addition && t("cart.rx.addition", { value: i.addition }),
    i.dominance && t("cart.rx.dominance", { value: i.dominance }),
    i.base_curve != null && t("cart.rx.baseCurve", { value: i.base_curve }),
    i.diameter != null && t("cart.rx.diameter", { value: i.diameter }),
  ].filter(Boolean).join(" · ");
}

function Progress({ order }: { order: Order }) {
  const reached = orderProgress(order.status);
  if (reached === null) {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-secondary p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden="true" />{t(`orders.notice.${order.status as "pending_payment" | "cancelled" | "refunded" | "expired"}`)}
      </p>
    );
  }
  return (
    <ol aria-label={t("orders.progressLabel")} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:gap-2">
      {steps.map((s, i) => {
        const done = i <= reached;
        return (
          <li key={s} aria-current={i === reached ? "step" : undefined} className="flex flex-1 items-center gap-3 sm:last:flex-none">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", done ? "bg-blue text-white" : "border border-border text-muted-foreground")}>
              {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn("text-sm", done ? "font-medium" : "text-muted-foreground")}>
              {t(`orders.progress.${s}`)}<span className="sr-only"> ({done ? t("orders.stepDone") : t("orders.stepPending")})</span>
            </span>
            {i < steps.length - 1 && <span aria-hidden="true" className={cn("hidden h-px flex-1 sm:block", i < reached ? "bg-blue" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

function ItemRow({ i }: { i: OrderItem }) {
  const isFrame = i.category === "frame";
  return (
    <li className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-4 text-sm">
      <div className="min-w-0 space-y-0.5">
        <Link href={productHref({ category: i.category, slug: i.product_slug })} className="font-medium hover:underline">{i.product_name}</Link>
        <p className="text-muted-foreground">{i.brand_name}{!isFrame && <> · {t(`orders.eye.${i.eye}`)}</>}{i.color && <> · {i.color}</>}</p>
        {isFrame ? (
          <>
            {i.lens_package_name && <p>{t("orders.lensPackage", { name: i.lens_package_name })}</p>}
            {i.lens_treatment && <p>{t("orders.treatment", { name: i.lens_treatment.name, price: formatMxn(i.treatment_price_cents ?? 0) })}</p>}
          </>
        ) : (
          <p className="optic text-xs">{optics(i)}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-medium">{formatMxn(i.unit_price_cents * i.quantity)}</p>
        <p className="text-xs text-muted-foreground">{t("orders.unitPrice", { count: i.quantity, price: formatMxn(i.unit_price_cents) })}</p>
      </div>
    </li>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const query = useGetOrder(id);
  const clipboard = useSyncExternalStore(() => () => {}, canCopy, () => false);
  const back = (
    <Link href="/cuenta/pedidos" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" />{t("orders.back")}
    </Link>
  );

  if (query.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-20 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }
  const status = query.data?.status;
  if (query.isError || (status !== 200 && status !== 404 && status !== 400)) {
    return (
      <div className="space-y-4">{back}
        <p className="text-sm text-destructive">{t("orders.loadFailed")}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>{t("common.retry")}</Button>
      </div>
    );
  }
  if (query.data?.status !== 200) {
    return (
      <div className="space-y-4">{back}
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="font-display text-xl">{t("orders.notFound")}</p>
        </div>
      </div>
    );
  }

  const order = query.data.data;
  const lenses = order.items.filter((i) => i.category !== "frame");
  const frames = order.items.filter((i) => i.category === "frame");
  const paid = order.paid_at != null || orderProgress(order.status) !== null;

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl">{t("orders.detailTitle", { folio: orderFolio(order.number) })}</h1>
          <p className="text-sm text-muted-foreground">{t("orders.placedOn", { date: dateFmt.format(new Date(order.created_at)) })}</p>
        </div>
        <OrderStatusBadge status={order.status} className="text-sm" />
      </div>

      <Progress order={order} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="order-items" className="rounded-2xl border bg-card px-5 pt-5">
          <h2 id="order-items" className="text-lg">{t("orders.items")}</h2>
          {lenses.length > 0 && (
            <>
              {frames.length > 0 && <h3 className="mt-4 text-sm font-semibold text-muted-foreground">{t("orders.lensesGroup")}</h3>}
              <ul className="divide-y">{lenses.map((i, n) => <ItemRow key={`l${n}`} i={i} />)}</ul>
            </>
          )}
          {frames.length > 0 && (
            <>
              {lenses.length > 0 && <h3 className="mt-4 text-sm font-semibold text-muted-foreground">{t("orders.framesGroup")}</h3>}
              <ul className="divide-y">{frames.map((i, n) => <ItemRow key={`f${n}`} i={i} />)}</ul>
            </>
          )}
        </section>

        <div className="space-y-4">
          <section aria-labelledby="order-breakdown" className="rounded-2xl border bg-card p-5">
            <h2 id="order-breakdown" className="mb-3 text-lg">{t("orders.breakdown.title")}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>{t("orders.breakdown.subtotal")}</dt><dd>{formatMxn(order.subtotal_cents)}</dd></div>
              {(order.shipping_cents > 0 || paid) && (
                <div className="flex justify-between"><dt>{t("orders.breakdown.shipping")}</dt><dd>{order.shipping_cents > 0 ? formatMxn(order.shipping_cents) : t("orders.breakdown.free")}</dd></div>
              )}
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-good"><dt>{t("orders.breakdown.discount")}</dt><dd>−{formatMxn(order.discount_cents)}</dd></div>
              )}
              <div className="flex items-baseline justify-between border-t pt-3"><dt className="font-medium">{t("orders.breakdown.total")}</dt><dd className="font-display text-2xl">{formatMxn(order.total_cents)}</dd></div>
            </dl>
          </section>

          {order.tracking_number && (
            <section aria-labelledby="order-tracking" className="rounded-2xl border bg-card p-5">
              <h2 id="order-tracking" className="mb-2 flex items-center gap-2 text-lg"><Truck className="size-5 text-blue" aria-hidden="true" />{t("orders.trackingTitle")}</h2>
              {order.tracking_carrier && <p className="text-sm text-muted-foreground">{order.tracking_carrier}</p>}
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="optic">{order.tracking_number}</span>
                {clipboard && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    await navigator.clipboard.writeText(order.tracking_number!);
                    toast.success(t("orders.copied"));
                  }}>
                    <Copy aria-hidden="true" />{t("orders.copyTracking")}
                  </Button>
                )}
              </div>
            </section>
          )}

          {canReorder(order.status) && order.items.some((i) => i.category !== "frame") && (
            <Link href={`/recompra/${order.id}`} className={buttonVariants({ size: "lg", className: "h-11 w-full" })}>{t("orders.reorder")}</Link>
          )}
        </div>
      </div>
    </div>
  );
}
