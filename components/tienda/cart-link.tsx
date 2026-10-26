"use client";

import Link from "next/link";
import { useGetCart } from "@/lib/api/generated/api";

export function CartLink() {
  const { data } = useGetCart();
  const count = data?.status === 200 ? data.data.item_count : 0;
  return (
    <Link href="/carrito" className="hover:underline">
      Carrito{count > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{count}</span>}
    </Link>
  );
}
