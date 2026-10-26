import { ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand-mark";
import { CartLink } from "@/components/tienda/cart-link";
import { ThemeToggle } from "@/components/theme-toggle";

export const categories = [
  { href: "/lentes?replacement=daily", label: "Diarios" },
  { href: "/lentes?replacement=monthly", label: "Mensuales" },
  { href: "/lentes?lens_type=toric", label: "Tóricos" },
  { href: "/lentes?lens_type=multifocal", label: "Multifocales" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Pupila, inicio" className="shrink-0">
          <Wordmark />
        </Link>
        <nav aria-label="Categorías" className="hidden items-center gap-1 text-sm font-medium md:flex">
          {categories.map((c) => (
            <Link key={c.href} href={c.href} className="rounded-full px-3 py-2 hover:bg-accent">
              {c.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/cuenta/recetas"
            className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-accent sm:block"
          >
            Mi receta
          </Link>
          <CartLink icon={<ShoppingBag className="size-6" aria-hidden="true" />} />
          <Link href="/cuenta" aria-label="Mi cuenta" className="rounded-full p-2 hover:bg-accent">
            <UserRound className="size-6" aria-hidden="true" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <nav
        aria-label="Categorías"
        className="container-page flex gap-2 overflow-x-auto pb-3 text-sm font-medium md:hidden"
      >
        {categories.map((c) => (
          <Link key={c.href} href={c.href} className="shrink-0 rounded-full border px-3 py-1.5 hover:bg-accent">
            {c.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
