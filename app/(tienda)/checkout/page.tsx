import type { Metadata } from "next";
import { CheckoutForm } from "@/components/tienda/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-4 text-3xl">Finalizar compra</h1>
      <ol aria-label="Pasos" className="optic mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {["Dirección", "Receta", "Pago"].map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
            <span className="text-foreground">{step}</span>
            {i < 2 && <span aria-hidden="true">—</span>}
          </li>
        ))}
      </ol>
      <CheckoutForm />
    </div>
  );
}
