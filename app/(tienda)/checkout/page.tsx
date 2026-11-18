import type { Metadata } from "next";
import { CheckoutForm } from "@/components/tienda/checkout-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("checkout.metaTitle"), robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-3xl">{t("checkout.title")}</h1>
      <CheckoutForm />
    </div>
  );
}
