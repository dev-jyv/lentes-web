"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useGetCart } from "@/lib/api/generated/api";

export function CartLink({ icon }: { icon: ReactNode }) {
  const { data } = useGetCart();
  const count = data?.status === 200 ? data.data.item_count : 0;
  return (
    <Link
      href="/carrito"
      aria-label={count > 0 ? `Carrito, ${count} artículos` : "Carrito"}
      className="relative grid size-11 place-items-center rounded-full hover:bg-accent"
    >
      {icon}
      {count > 0 && (
        <span className="optic absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-amber px-1 text-[11px] font-medium text-background">
          {count}
        </span>
      )}
    </Link>
  );
}
