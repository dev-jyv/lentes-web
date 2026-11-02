import { ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand-mark";
import { CartLink } from "@/components/tienda/cart-link";
import { MegaMenu } from "@/components/tienda/mega-menu";
import { MobileMenu } from "@/components/tienda/mobile-menu";
import { PromoBar } from "@/components/tienda/promo-bar";
import { SearchForm } from "@/components/tienda/search-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND } from "@/lib/brand";
import { buildNavigation, mergeBrands } from "@/lib/navigation";
import { loadFacets, loadHome } from "@/lib/storefront";

export async function SiteHeader() {
  const [frames, lenses, home] = await Promise.all([loadFacets("frame"), loadFacets("contact_lens"), loadHome()]);
  const items = buildNavigation({ frames, lenses, brands: mergeBrands(frames, lenses) });

  return (
    <>
      {home?.promo_bar && <PromoBar banner={home.promo_bar} />}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-1 lg:gap-4">
            <MobileMenu items={items} />
            <Link href="/" aria-label={`${BRAND.name}, inicio`} className="flex min-h-11 shrink-0 items-center">
              <Wordmark />
            </Link>
            <MegaMenu items={items} />
          </div>
          <SearchForm id="buscar-escritorio" className="hidden max-w-sm flex-1 lg:block" />
          <div className="flex items-center gap-1">
            <Link
              href="/cuenta/recetas"
              className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium hover:bg-accent sm:flex"
            >
              Mi receta
            </Link>
            <CartLink icon={<ShoppingBag className="size-6" aria-hidden="true" />} />
            <Link href="/cuenta" aria-label="Mi cuenta" className="hidden size-11 place-items-center rounded-full hover:bg-accent sm:grid">
              <UserRound className="size-6" aria-hidden="true" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <div className="container-page pb-3 lg:hidden">
          <SearchForm id="buscar-movil" />
        </div>
      </header>
    </>
  );
}
