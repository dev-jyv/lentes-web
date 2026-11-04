import type { Metadata } from "next";
import { OrderHistory } from "@/components/cuenta/order-history";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.orders"), robots: { index: false } };

export default function OrdersPage() {
  return (
    <div className="ph-no-capture mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl">{t("account.orders")}</h1>
      <OrderHistory />
    </div>
  );
}
