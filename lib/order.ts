import type { OrderStatus } from "@/lib/api/generated/model";

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  expired: "Vencido",
};

export const orderFolio = (n: number) => `LC-${String(n).padStart(6, "0")}`;

// Se puede repetir una compra de un pedido que sí se cobró.
export const canReorder = (s: OrderStatus) => ["paid", "preparing", "shipped", "delivered"].includes(s);
