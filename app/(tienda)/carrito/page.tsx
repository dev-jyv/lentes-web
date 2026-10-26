import type { Metadata } from "next";
import { CartView } from "@/components/tienda/cart-view";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Tu carrito</h1>
      <CartView />
    </div>
  );
}
