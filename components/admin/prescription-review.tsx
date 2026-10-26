"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminReviewPrescription, getAdminListPrescriptionsQueryKey, useAdminListPrescriptions,
} from "@/lib/api/generated/admin/admin";

const params = { status: "pending" } as const;

export function PrescriptionReview() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminListPrescriptions(params);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (data?.status === 403) return <p>No tienes permisos de administrador.</p>;
  const items = data?.status === 200 ? data.data.items : [];
  if (items.length === 0) return <p className="text-muted-foreground">No hay recetas pendientes.</p>;

  async function review(id: string, status: "approved" | "rejected") {
    await adminReviewPrescription(id, { status });
    await queryClient.invalidateQueries({ queryKey: getAdminListPrescriptionsQueryKey(params) });
  }

  return (
    <ul className="divide-y rounded-lg border">
      {items.map((r) => (
        <li key={r.id} className="space-y-2 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-medium">{r.customer_email}</p>
              <p className="text-muted-foreground">
                Dr(a). {r.doctor_name}{r.doctor_license ? ` · Cédula ${r.doctor_license}` : ""} · emitida {r.issued_at} · vigente hasta {r.expires_at}
              </p>
            </div>
            {r.file_url && (
              <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="underline">
                Ver archivo
              </a>
            )}
          </div>
          <p>
            OD: esf {r.od_sphere} cil {r.od_cylinder ?? "—"} eje {r.od_axis ?? "—"} add {r.od_addition ?? "—"}<br />
            OI: esf {r.os_sphere} cil {r.os_cylinder ?? "—"} eje {r.os_axis ?? "—"} add {r.os_addition ?? "—"}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => review(r.id, "approved")}>Aprobar</Button>
            <Button size="sm" variant="outline" onClick={() => review(r.id, "rejected")}>Rechazar</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
