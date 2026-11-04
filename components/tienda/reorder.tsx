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
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

const eyeLabel = { right: t("cart.rightEye"), left: t("cart.leftEye"), both: t("cart.bothEyes") } as const;
const reasonLabel = { out_of_stock: t("reorder.reason.outOfStock"), discontinued: t("reorder.reason.discontinued"), not_reorderable: t("reorder.reason.notReorderable") } as const;
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
    return <p>{rich(t("reorder.notFound"), { link: (c) => <Link href="/lentes" className="underline">{c}</Link> })}</p>;
  }
  const order = data.data;

  async function add() {
    setBusy(true);
    setError(null);
    const res = await reorderOrder(orderId, { method: "POST" });
    if (res.status !== 200) {
      setBusy(false);
      return setError(t("reorder.prepareFailed"));
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
        <h1 className="text-2xl">{t("reorder.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("reorder.note", { folio: `LC-${String(order.number).padStart(6, "0")}` })}
        </p>
      </div>
      <ul className="divide-y rounded-lg border">
        {(order.items ?? []).map((i, idx) => (
          <li key={idx} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
            <div>
              <p className="font-medium">{i.product_name} <span className="text-muted-foreground">· {i.brand_name}</span></p>
              {i.category === "frame" ? (
                <p>{t("reorder.frames", { count: i.quantity })}{i.lens_package_name ? ` · ${i.lens_package_name}` : ""}</p>
              ) : (
                <p>{eyeLabel[i.eye]} · {t("reorder.boxes", { count: i.quantity })}</p>
              )}
              <p className="optic text-xs text-muted-foreground">
                {[i.sphere != null && t("cart.rx.sphere", { value: sign(i.sphere) }),
                  i.cylinder != null && t("cart.rx.cylinder", { value: sign(i.cylinder) }),
                  i.axis != null && t("cart.rx.axis", { value: i.axis }),
                  i.addition && t("cart.rx.addition", { value: i.addition }),
                  i.dominance && t("cart.rx.dominance", { value: i.dominance })].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="text-muted-foreground">{t("reorder.previousPrice", { price: formatMxn(i.unit_price_cents) })}</span>
          </li>
        ))}
      </ul>
      {unavailable.length > 0 && (
        <div role="alert" className="space-y-2 rounded-lg border border-destructive p-4 text-sm">
          <p className="font-medium">{t("reorder.someUnavailable")}</p>
          <ul className="list-disc pl-5">
            {unavailable.map((u, i) => <li key={i}>{u.product_name}: {reasonLabel[u.reason]}</li>)}
          </ul>
          <Button render={<Link href="/carrito" />} nativeButton={false}>{t("reorder.goToCart")}</Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {unavailable.length === 0 && (
        <Button size="lg" onClick={add} disabled={busy}>
          {busy ? t("frames.adding") : t("frames.addToCart")}
        </Button>
      )}
    </div>
  );
}
