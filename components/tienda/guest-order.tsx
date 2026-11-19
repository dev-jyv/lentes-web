"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderView } from "@/components/cuenta/order-detail";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getGuestOrder } from "@/lib/api/generated/api";
import { clearGuestDraft, readGuestDraft } from "@/lib/guest-checkout";
import { orderProgress } from "@/lib/order";
import { t } from "@/lib/i18n";

export function GuestOrder({ id, token }: { id: string; token: string }) {
  const query = useQuery({
    queryKey: ["guest-order", id, token],
    queryFn: () => getGuestOrder(id, { headers: { "X-Order-Token": token } }),
    enabled: !!token,
    retry: false,
  });
  // El correo de la compra prellena el registro; se lee antes de borrar el borrador.
  const [email] = useState(() => readGuestDraft().contact?.email);
  const order = query.data?.status === 200 ? query.data.data : undefined;
  const paid = !!order && (order.paid_at != null || orderProgress(order.status) !== null);
  // Pagado el pedido, el borrador de la pestaña (contacto y dirección) ya no hace falta.
  useEffect(() => {
    if (paid) clearGuestDraft();
  }, [paid]);

  const back = (
    <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" />{t("guestOrder.back")}
    </Link>
  );

  if (token && query.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-20 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }
  if (token && query.isError) {
    return (
      <div className="space-y-4">{back}
        <p className="text-sm text-destructive">{t("guestOrder.loadFailed")}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>{t("common.retry")}</Button>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-dashed p-8 text-center">
        <h1 className="font-display text-2xl">{t("guestOrder.notFound")}</h1>
        <p className="text-sm text-muted-foreground">{t("guestOrder.notFoundBody")}</p>
        <Link href="/" className={buttonVariants({ size: "lg", className: "px-5" })}>{t("guestOrder.back")}</Link>
      </div>
    );
  }

  const signup = paid && (
    <section aria-labelledby="guest-signup" className="space-y-3 rounded-2xl border border-blue/40 bg-blue-soft p-5">
      <h2 id="guest-signup" className="flex items-center gap-2 text-lg"><UserPlus className="size-5 text-blue" aria-hidden="true" />{t("guestOrder.createAccountTitle")}</h2>
      <p className="text-sm">{t("guestOrder.createAccountBody")}</p>
      <Link href={email ? `/registro?email=${encodeURIComponent(email)}` : "/registro"} className={buttonVariants({ size: "lg", className: "h-11 w-full" })}>
        {t("guestOrder.createAccountCta")}
      </Link>
    </section>
  );
  return <OrderView order={order} back={back} guest aside={signup} />;
}
