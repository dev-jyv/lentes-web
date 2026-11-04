import type { Metadata } from "next";
import { OrderStatus } from "@/components/tienda/order-status";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("checkout.result.metaTitle"), robots: { index: false } };

export default async function ResultPage({
  searchParams,
}: { searchParams: Promise<{ external_reference?: string }> }) {
  // Mercado Pago regresa external_reference = order_id.
  const { external_reference } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      {external_reference ? (
        <OrderStatus orderId={external_reference} />
      ) : (
        <p>{t("checkout.result.noInfo")}</p>
      )}
    </div>
  );
}
