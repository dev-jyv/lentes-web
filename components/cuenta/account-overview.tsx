"use client";

import { ArrowRight, FileText, MapPin, Package, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/cuenta/order-status-badge";
import { useGetMe, useListAddresses, useListMyOrders } from "@/lib/api/generated/api";
import { formatMxn } from "@/lib/format";
import { orderFolio } from "@/lib/order";
import { t } from "@/lib/i18n";

const monthYear = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });
const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

function Tile({ href, icon, title, children }: { href: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-blue/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <span className="grid size-10 place-items-center rounded-full bg-blue-soft text-blue">{icon}</span>
      <span className="font-display text-lg">{title}</span>
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{children}</span>
      <span className="flex items-center gap-1 text-sm font-medium text-blue">
        {t("account.cards.manage")}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function AccountOverview() {
  const me = useGetMe();
  const addresses = useListAddresses();
  const orders = useListMyOrders();

  if (me.isLoading || addresses.isLoading || orders.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>
      </div>
    );
  }
  if (me.isError) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive">{t("account.loadFailed")}</p>
        <Button variant="outline" onClick={() => void me.refetch()}>{t("common.retry")}</Button>
      </div>
    );
  }

  const profile = me.data?.status === 200 ? me.data.data : undefined;
  const list = addresses.data?.status === 200 ? addresses.data.data.items : [];
  const main = list.find((a) => a.is_default) ?? list[0];
  const last = orders.data?.status === 200 ? orders.data.data.items[0] : undefined;

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy p-6 text-white">
        <div>
          <p className="font-display text-2xl">{profile?.full_name ? t("account.hello", { name: profile.full_name.split(/\s+/)[0] }) : t("account.greeting")}</p>
          {profile && <p className="text-sm text-white/75">{t("account.memberSince", { date: monthYear.format(new Date(profile.created_at)) })}</p>}
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{profile?.email}</span>
      </section>

      <section aria-labelledby="last-order" className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="last-order" className="flex items-center gap-2 text-lg"><Package className="size-5 text-blue" aria-hidden="true" />{t("account.lastOrder.title")}</h2>
          {last && <Link href="/cuenta/pedidos" className="text-sm font-medium text-blue underline-offset-4 hover:underline">{t("account.lastOrder.viewAll")}</Link>}
        </div>
        {last ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="flex flex-wrap items-center gap-2"><span className="optic font-medium">{orderFolio(last.number)}</span><OrderStatusBadge status={last.status} /></p>
              <p className="text-sm text-muted-foreground">{dateFmt.format(new Date(last.created_at))} · {formatMxn(last.total_cents)}</p>
            </div>
            <Link href={`/cuenta/pedidos/${last.id}`} className={buttonVariants({ variant: "outline", size: "lg", className: "px-4" })}>{t("account.lastOrder.detail")}</Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("account.lastOrder.empty")}{" "}
            <Link href="/armazones" className="font-medium text-blue underline">{t("account.lastOrder.shop")}</Link>
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile href="/cuenta/perfil" icon={<UserRound className="size-5" aria-hidden="true" />} title={t("account.nav.profile")}>
          {profile?.full_name ? <>{profile.full_name}{profile.phone && <><br />{profile.phone}</>}</> : t("account.cards.profileEmpty")}
        </Tile>
        <Tile href="/cuenta/direcciones" icon={<MapPin className="size-5" aria-hidden="true" />} title={t("account.nav.addresses")}>
          {main ? <>{main.recipient}<br />{main.street} {main.ext_number}, {main.neighborhood}<br />{t("account.cards.addressesCount", { count: list.length })}</> : t("account.cards.addressesEmpty")}
        </Tile>
        <Tile href="/cuenta/recetas" icon={<FileText className="size-5" aria-hidden="true" />} title={t("account.nav.prescriptions")}>
          {t("account.cards.prescriptions")}
        </Tile>
      </div>
    </div>
  );
}
