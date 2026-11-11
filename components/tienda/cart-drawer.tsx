"use client";

import { X } from "lucide-react";
import { createContext, use, useState, type ReactNode } from "react";
import { CartView } from "@/components/tienda/cart-view";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { t } from "@/lib/i18n";

const CartDrawerContext = createContext<((open: boolean) => void) | null>(null);

// Abre el panel lateral del carrito desde el header o tras agregar un producto.
export function useCartDrawer() {
  const setOpen = use(CartDrawerContext);
  if (!setOpen) throw new Error("useCartDrawer requiere CartDrawerProvider");
  return { open: () => setOpen(true), close: () => setOpen(false) };
}

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CartDrawerContext value={setOpen}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="gap-0 data-[side=right]:w-full data-[side=right]:min-[600px]:w-110 data-[side=right]:sm:max-w-none"
          // Cualquier enlace (producto, pago) navega fuera del panel.
          onClick={(e) => (e.target as Element).closest("a") && setOpen(false)}
        >
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <SheetTitle className="flex-1 text-lg font-bold">{t("cart.title")}</SheetTitle>
            <SheetClose aria-label={t("common.close")} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-accent">
              <X className="size-5" aria-hidden="true" />
            </SheetClose>
          </div>
          <CartView variant="drawer" />
        </SheetContent>
      </Sheet>
    </CartDrawerContext>
  );
}
