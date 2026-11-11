"use client";

import type { ReactNode } from "react";
import { useCartDrawer } from "@/components/tienda/cart-drawer";
import { useGetCart } from "@/lib/api/generated/api";
import { t } from "@/lib/i18n";

export function CartLink({ icon }: { icon: ReactNode }) {
  const { data } = useGetCart();
  const { open } = useCartDrawer();
  const count = data?.status === 200 ? data.data.item_count : 0;
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-label={count > 0 ? t("cart.linkWithCount", { count }) : t("cart.metaTitle")}
      className="relative grid size-11 place-items-center rounded-full hover:bg-accent"
    >
      {icon}
      {count > 0 && (
        <span className="optic absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-sun px-1 text-[11px] font-medium text-navy">
          {count}
        </span>
      )}
    </button>
  );
}
