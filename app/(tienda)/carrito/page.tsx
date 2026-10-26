import type { Metadata } from "next";
import { CartView } from "@/components/tienda/cart-view";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-3xl">Tu carrito</h1>
      <CartView />
    </div>
  );
}
