import Link from "next/link";
import { CartLink } from "@/components/tienda/cart-link";

const links = [
  { href: "/lentes", label: "Lentes" },
  { href: "/cuenta", label: "Mi cuenta" },
];

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold">
          Lentes
        </Link>
        <nav className="flex gap-6 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
          <CartLink />
        </nav>
      </div>
    </header>
  );
}
