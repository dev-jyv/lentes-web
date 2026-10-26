import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandMark className="size-6" />
          <p>© {new Date().getFullYear()} {BRAND.name}. Lentes de contacto en México.</p>
        </div>
        <nav aria-label="Pie" className="flex gap-5">
          <Link href="/lentes" className="hover:text-foreground">Catálogo</Link>
          <Link href="/cuenta/recetas" className="hover:text-foreground">Mi receta</Link>
          <Link href="/cuenta" className="hover:text-foreground">Mi cuenta</Link>
        </nav>
      </div>
    </footer>
  );
}
