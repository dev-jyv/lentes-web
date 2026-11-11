import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand-mark";
import { AccountLink } from "@/components/tienda/account-link";
import { CartLink } from "@/components/tienda/cart-link";
import { MegaMenu } from "@/components/tienda/mega-menu";
import { MobileMenu } from "@/components/tienda/mobile-menu";
import { PromoBar } from "@/components/tienda/promo-bar";
import { SearchSuggest } from "@/components/tienda/search-suggest";
import { imageSrc } from "@/lib/images";
import { buildNavigation, mergeBrands, searchChips } from "@/lib/navigation";
import { isInternalHref } from "@/lib/safe-next";
import { loadFacets, loadHome } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export async function SiteHeader() {
  const [frames, lenses, home] = await Promise.all([loadFacets("frame"), loadFacets("contact_lens"), loadHome()]);
  const items = buildNavigation({ frames, lenses, brands: mergeBrands(frames, lenses) });
  // Sugerencias del buscador (SPEC 07): salen de los mismos datos cacheados del header.
  const suggest = {
    chips: searchChips(frames, lenses),
    featured: [...(home?.featured.frame ?? []), ...(home?.featured.contact_lens ?? [])].slice(0, 6),
    recommended: home?.secondary.find((b) => imageSrc(b.image_url) && isInternalHref(b.cta_href)) ?? null,
  };

  return (
    <>
      {home?.promo_bar && <PromoBar banner={home.promo_bar} />}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="container-page flex h-16 items-center gap-3 lg:h-18 lg:gap-8">
          <MobileMenu items={items} />
          <Link href="/" aria-label={t("nav.home")} className="flex min-h-11 shrink-0 items-center">
            <Wordmark />
          </Link>
          <SearchSuggest id="buscar-escritorio" className="hidden flex-1 lg:block" {...suggest} />
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <AccountLink />
            <CartLink icon={<ShoppingBag className="size-6" aria-hidden="true" />} />
          </div>
        </div>
        <div className="container-page pb-3 lg:hidden">
          <SearchSuggest id="buscar-movil" compact {...suggest} />
        </div>
      </header>
      <MegaMenu items={items} />
    </>
  );
}
