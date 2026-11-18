import type { OrderStatus } from "@/lib/api/generated/model";
import { t } from "@/lib/i18n";

export const orderStatusLabel: Record<OrderStatus, string> = t("labels.orderStatus", { returnObjects: true });

export const orderFolio = (n: number) => `LC-${String(n).padStart(6, "0")}`;

// Se puede repetir una compra de un pedido que sí se cobró.
export const canReorder = (s: OrderStatus) => ["paid", "preparing", "shipped", "delivered"].includes(s);

// Paso alcanzado en la línea de avance del detalle (SPEC 22): 0 pagado … 3 entregado; null si no aplica.
export function orderProgress(s: OrderStatus): number | null {
  switch (s) {
    case "paid": return 0;
    case "preparing": return 1;
    case "shipped": return 2;
    case "delivered": return 3;
    case "pending_payment":
    case "cancelled":
    case "refunded":
    case "expired":
      return null;
  }
}
