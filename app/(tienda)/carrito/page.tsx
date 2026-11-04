import type { Metadata } from "next";
import { CartView } from "@/components/tienda/cart-view";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("cart.metaTitle"), robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-3xl">{t("cart.title")}</h1>
      <CartView />
    </div>
  );
}
