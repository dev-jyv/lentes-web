"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListPrescriptions } from "@/lib/api/provisional/api";
import { isExpired, rxStatusLabel } from "@/lib/prescription";

export function PrescriptionList() {
  const { data, isLoading } = useListPrescriptions();
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  const items = data?.status === 200 ? data.data.items : [];
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Aún no has subido recetas.</p>;

  return (
    <ul className="divide-y rounded-lg border">
      {items.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <div>
            <p className="font-medium">{r.doctor_name}</p>
            <p className="text-xs text-muted-foreground">
              OD {r.od_sphere} · OI {r.os_sphere} · vigente hasta {r.expires_at}
            </p>
          </div>
          <div className="flex gap-2">
            {isExpired(r.expires_at) && <Badge variant="outline">Vencida</Badge>}
            <Badge variant={r.status === "rejected" ? "destructive" : "secondary"}>
              {rxStatusLabel[r.status]}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
