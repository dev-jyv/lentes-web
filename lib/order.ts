import type { OrderStatus } from "@/lib/api/generated/model";
import { t } from "@/lib/i18n";

export const orderStatusLabel: Record<OrderStatus, string> = t("labels.orderStatus", { returnObjects: true });

export const orderFolio = (n: number) => `LC-${String(n).padStart(6, "0")}`;

// Se puede repetir una compra de un pedido que sí se cobró.
export const canReorder = (s: OrderStatus) => ["paid", "preparing", "shipped", "delivered"].includes(s);
