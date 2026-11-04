import { ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand-mark";
import { CartLink } from "@/components/tienda/cart-link";
import { MegaMenu } from "@/components/tienda/mega-menu";
import { MobileMenu } from "@/components/tienda/mobile-menu";
import { PromoBar } from "@/components/tienda/promo-bar";
import { SearchForm } from "@/components/tienda/search-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { buildNavigation, mergeBrands } from "@/lib/navigation";
import { loadFacets, loadHome } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export async function SiteHeader() {
  const [frames, lenses, home] = await Promise.all([loadFacets("frame"), loadFacets("contact_lens"), loadHome()]);
  const items = buildNavigation({ frames, lenses, brands: mergeBrands(frames, lenses) });

  return (
    <>
      {home?.promo_bar && <PromoBar banner={home.promo_bar} />}
      <header id="site-header" className="sticky top-0 z-40 border-b bg-card">
        <div className="container-page flex h-16 items-center gap-3">
          <MobileMenu items={items} />
          <Link href="/" aria-label={t("nav.home")} className="flex min-h-11 shrink-0 items-center">
            <Wordmark />
          </Link>
          <MegaMenu items={items} />
          <SearchForm id="buscar-escritorio" className="ml-auto hidden w-full max-w-xs lg:block" />
          <div className="ml-auto flex items-center gap-1 lg:ml-2">
            <Link
              href="/cuenta/recetas"
              className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap hover:bg-accent sm:flex"
            >
              {t("nav.myPrescription")}
            </Link>
            <CartLink icon={<ShoppingBag className="size-6" aria-hidden="true" />} />
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <Link
              href="/cuenta"
              aria-label={t("account.title")}
              className="hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent sm:flex lg:px-3"
            >
              <UserRound className="size-6" aria-hidden="true" />
              <span className="hidden lg:inline">{t("account.title")}</span>
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
