import type { Metadata } from "next";
import { CheckoutForm } from "@/components/tienda/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Finalizar compra</h1>
      <CheckoutForm />
    </div>
  );
}
