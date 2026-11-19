import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderHistory } from "@/components/cuenta/order-history";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.orders"), robots: { index: false } };

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl">{t("account.orders")}</h1>
      {/* El filtro vive en ?estado= (useSearchParams). */}
      <Suspense fallback={<Skeleton className="h-44 w-full rounded-2xl" />}>
        <OrderHistory />
      </Suspense>
    </div>
  );
}
