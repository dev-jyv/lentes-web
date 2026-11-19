import { cn } from "cn";
import type { OrderStatus } from "@/lib/api/generated/model";
import { orderStatusLabel } from "@/lib/order";

// Color por grupo de estado (SPEC 22); siempre con texto, nunca solo color.
const tone: Record<OrderStatus, string> = {
  pending_payment: "bg-sun-soft text-navy",
  paid: "bg-blue-soft text-blue",
  preparing: "bg-blue-soft text-blue",
  shipped: "bg-blue-soft text-blue",
  delivered: "bg-good/15 text-good",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tone[status], className)}>
      {orderStatusLabel[status]}
    </span>
  );
}
