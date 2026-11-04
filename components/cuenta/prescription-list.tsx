"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListPrescriptions } from "@/lib/api/generated/api";
import { isExpired, rxStatusLabel } from "@/lib/prescription";
import { t } from "@/lib/i18n";

export function PrescriptionList() {
  const { data, isLoading } = useListPrescriptions();
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  const items = data?.status === 200 ? data.data.items : [];
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t("rx.empty")}</p>;

  return (
    <ul className="divide-y rounded-lg border">
      {items.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <div>
            <p className="font-medium">{r.doctor_name} <span className="font-normal text-muted-foreground">· {r.kind === "glasses" ? t("common.frames") : t("common.contactLenses")}</span></p>
            <p className="text-xs text-muted-foreground">
              <span className="optic">{t("rx.eyes", { od: r.od_sphere, os: r.os_sphere })}</span> · {t("rx.validUntil", { date: r.expires_at })}{r.pd_mm != null && <> · <span className="optic">{t("rx.pd", { value: r.pd_mm })}</span></>}
            </p>
          </div>
          {r.status === "rejected" && r.reject_reason && (
            <p className="basis-full text-sm text-destructive">{t("rx.rejectReason", { reason: r.reject_reason })}</p>
          )}
          <div className="flex gap-2">
            {isExpired(r.expires_at) && <Badge variant="outline">{t("rx.expired")}</Badge>}
            <Badge variant={r.status === "rejected" ? "destructive" : "secondary"}>
              {rxStatusLabel[r.status]}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
