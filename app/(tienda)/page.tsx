import { ArrowRight, BadgeCheck, FileCheck2, Headset, RefreshCw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FrameShapeIcon } from "@/components/tienda/frame-shape-icon";
import { HeroCarousel } from "@/components/tienda/hero-carousel";
import { HeroLens } from "@/components/tienda/hero-lens";
import { HomeMosaic, mosaicContent } from "@/components/tienda/home-mosaic";
import { ProductCard } from "@/components/tienda/product-card";
import { listProducts } from "@/lib/api/generated/api";
import type { CatalogFacets, HeroArt, HomeBanner, HomeContent, Product, PromiseIcon } from "@/lib/api/generated/model";
import { imageSrc } from "@/lib/images";
import { FRAME_PRICE_BANDS, mergeBrands, priceBandLabel } from "@/lib/navigation";
import { isInternalHref } from "@/lib/safe-next";
import { loadCatalog, loadFacets, loadHome } from "@/lib/storefront";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

// Conjunto cerrado de íconos de la franja de promesas (SPEC 15, punto 10).
const PROMISE_ICONS: Record<PromiseIcon, LucideIcon> = {
  prescription: FileCheck2, reorder: RefreshCw, payment: ShieldCheck, support: Headset, delivery: Truck, quality: BadgeCheck,
};

type PromiseItem = { icon: LucideIcon; title: string };

// Promesas de código: solo se usan si GET /v1/home falla (SPEC 15, punto 22).
const FALLBACK_PROMISES: PromiseItem[] = [
  { icon: FileCheck2, title: t("home.promises.prescription") },
  { icon: RefreshCw, title: t("home.promises.reorder") },
  { icon: ShieldCheck, title: t("home.promises.payment") },
];

const MAX_PROMISES = 3;
// La franja se ajusta a 1, 2 o 3 columnas sin dejar huecos.
const PROMISE_COLS = ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3"];

const slideCta = "inline-flex h-12 items-center justify-center rounded-full bg-white px-8 font-semibold text-band transition-colors hover:bg-white/85";

// Destacados elegidos en el admin; si aún no hay, los más recientes para no dejar el home vacío.
async function featuredOrNewest(featured: Product[] | undefined, category: Product["category"]) {
  if (featured?.length) return featured;
  const res = await listProducts({ category, limit: 4 }).catch(() => null);
  return res?.status === 200 ? res.data.items : [];
}

// Texto de una diapositiva. Solo la primera lleva el h1 de la página.
function SlideText({ first, title, subtitle, children }: { first: boolean; title: React.ReactNode; subtitle?: string | null; children: React.ReactNode }) {
  const Heading = first ? "h1" : "h2";
  return (
    <div className="relative mx-auto max-w-xl space-y-5 text-center text-white lg:mx-0 lg:w-1/2 lg:max-w-none lg:px-10">
      <Heading className="text-4xl leading-[1.05] font-extrabold sm:text-5xl xl:text-6xl">{title}</Heading>
      {subtitle && <p className="text-lg text-white/90">{subtitle}</p>}
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}

function BannerSlide({ banner, first }: { banner: HomeBanner; first: boolean }) {
  return (
    <div className="relative flex h-full items-center bg-band">
      <Image src={imageSrc(banner.image_url)!} alt={banner.image_alt ?? ""} fill unoptimized priority={first} sizes="100vw" className="object-cover" />
      <span aria-hidden="true" className="absolute inset-0 bg-black/45 lg:bg-gradient-to-r lg:from-black/70 lg:via-black/35 lg:to-transparent" />
      <div className="container-page relative">
        <SlideText first={first} title={banner.title} subtitle={banner.subtitle}>
          {banner.cta_label && isInternalHref(banner.cta_href) && (
            <Link href={banner.cta_href} className={slideCta}>{banner.cta_label}</Link>
          )}
        </SlideText>
      </div>
    </div>
  );
}

// Diapositiva de marca: fondo de marca con una ilustración, sin foto.
function DefaultSlide({ first, title, subtitle, art, children }: { first: boolean; title: React.ReactNode; subtitle: string | null; art: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center bg-band bg-[radial-gradient(circle_at_78%_50%,color-mix(in_srgb,var(--blue-vivid)_55%,transparent),transparent_60%)]">
      <div className="container-page flex items-center">
        <SlideText first={first} title={title} subtitle={subtitle}>{children}</SlideText>
        {art && <div className="hidden w-1/2 justify-center text-white lg:flex">{art}</div>}
      </div>
    </div>
  );
}

// Ilustración de un hero sin imagen (SPEC 15, punto 11). `none` no lleva.
function heroArt(art: HeroArt | null) {
  switch (art) {
    case "lens": return <div className="w-80"><HeroLens /></div>;
    case "frame": return <FrameShapeIcon shape="round" className="w-96" />;
    case "reorder": return <RefreshCw className="size-56" aria-hidden="true" />;
    default: return null;
  }
}

function BrandSlide({ banner, first }: { banner: HomeBanner; first: boolean }) {
  return (
    <DefaultSlide first={first} title={banner.title} subtitle={banner.subtitle} art={heroArt(banner.art)}>
      {banner.cta_label && isInternalHref(banner.cta_href) && (
        <Link href={banner.cta_href} className={slideCta}>{banner.cta_label}</Link>
      )}
    </DefaultSlide>
  );
}

// El carrusel muestra lo que traiga `heroes` (SPEC 15, punto 21): con imagen, foto; sin imagen, fondo de marca.
// Un hero cuya imagen ya no es válida se omite.
function bannerSlides(heroes: HomeBanner[]) {
  return heroes
    .filter((b) => b.image_url == null || imageSrc(b.image_url))
    .map((b, i) => b.image_url == null
      ? <BrandSlide key={b.id} banner={b} first={i === 0} />
      : <BannerSlide key={b.id} banner={b} first={i === 0} />);
}

// Diapositivas de código: solo si GET /v1/home falla (SPEC 15, punto 22).
function defaultSlides(hasFrames: boolean) {
  const lensSlide = (first: boolean) => (
    <DefaultSlide
      key="lentes"
      first={first}
      title={rich(t("home.hero.lenses.title"), { em: (c) => <em className="text-sun not-italic">{c}</em> })}
      subtitle={t("home.hero.lenses.subtitle")}
      art={<div className="w-80"><HeroLens /></div>}
    >
      <Link href="/lentes" className={slideCta}>{t("common.viewContactLenses")}</Link>
    </DefaultSlide>
  );
  const reorderSlide = (
    <DefaultSlide
      key="reposicion"
      first={false}
      title={t("home.hero.reorder.title")}
      subtitle={t("home.hero.reorder.subtitle")}
      art={<RefreshCw className="size-56" aria-hidden="true" />}
    >
      <Link href="/cuenta/pedidos" className={slideCta}>{t("home.hero.reorder.cta")}</Link>
    </DefaultSlide>
  );
  if (!hasFrames) return [lensSlide(true), reorderSlide];
  return [
    <DefaultSlide
      key="armazones"
      first
      title={rich(t("home.hero.frames.title"), { em: (c) => <em className="text-sun not-italic">{c}</em> })}
      subtitle={t("home.hero.frames.subtitle")}
      art={<FrameShapeIcon shape="round" className="w-96" />}
    >
      <Link href="/armazones" className={slideCta}>{t("common.viewFrames")}</Link>
    </DefaultSlide>,
    lensSlide(false),
    reorderSlide,
  ];
}

function promisesOf(home: HomeContent | null): PromiseItem[] {
  if (!home) return FALLBACK_PROMISES;
  return home.promises
    .filter((p) => p.icon && Object.hasOwn(PROMISE_ICONS, p.icon))
    .slice(0, MAX_PROMISES)
    .map((p) => ({ icon: PROMISE_ICONS[p.icon!], title: p.title }));
}

function Hero({ home, hasFrames }: { home: HomeContent | null; hasFrames: boolean }) {
  const slides = home ? bannerSlides(home.heroes) : defaultSlides(hasFrames);
  const promises = promisesOf(home);
  return (
    <>
      {/* Sin heroes el home empieza en la franja de promesas; el h1 queda para lectores de pantalla. */}
      {slides.length > 0 ? <HeroCarousel>{slides}</HeroCarousel> : <h1 className="sr-only">{t("meta.defaultTitle")}</h1>}
      {promises.length > 0 && (
        <section aria-label={t("home.promisesLabel")} className={`container-page relative z-10 ${slides.length > 0 ? "-mt-7" : "mt-6"}`}>
          <ul className={`grid gap-3 rounded-3xl border bg-card px-6 py-4 shadow-md md:divide-x md:rounded-full ${PROMISE_COLS[promises.length]}`}>
            {promises.map(({ icon: Icon, title }, i) => (
              <li key={`${i}-${title}`} className="flex items-center gap-3 font-medium md:justify-center md:px-4">
                <Icon className="size-6 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-sm lg:text-base">{title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ProductRow({ title, href, products, className = "" }: { title: string; href: string; products: Product[]; className?: string }) {
  if (products.length === 0) return null;
  return (
    <section className={`container-page space-y-4 py-8 ${className}`}>
      <div className="flex items-end justify-between">
        <h2 className="text-2xl">{title}</h2>
        <Link href={href} className="text-sm font-medium text-primary hover:underline">{t("home.viewAll")}</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [home, frames, lenses, catalog] = await Promise.all([loadHome(), loadFacets("frame"), loadFacets("contact_lens"), loadCatalog()]);
  const hasFrames = (frames?.total ?? 0) > 0;
  const [frameProducts, lensProducts] = await Promise.all([
    hasFrames ? featuredOrNewest(home?.featured.frame, "frame") : Promise.resolve([]),
    featuredOrNewest(home?.featured.contact_lens, "contact_lens"),
  ]);

  // Valores con productos, con la etiqueta y el orden del catálogo (SPEC 16).
  const present = (facet: CatalogFacets, key: string): [string, string][] =>
    (facet.values[key] ?? []).filter((v) => v.count > 0).map((v) => [v.value, v.label]);
  const shapes = frames ? present(frames, "shape") : [];
  const minFramePrice = frames?.min_price_cents;
  const priceBands = minFramePrice == null ? [] : FRAME_PRICE_BANDS.filter((band) => band >= minFramePrice);
  // Sin datos del catálogo (API caída) quedan solo los enlaces fijos que el home ya ofrecía.
  const fallback = (kind: "replacement" | "lens_type", keep: (code: string) => boolean): [string, string][] =>
    catalog.entries(kind).filter((e) => keep(e.code)).map((e) => [e.code, e.label]);
  const uses = lenses ? present(lenses, "replacement") : fallback("replacement", (v) => v === "daily" || v === "monthly");
  const needs = lenses ? present(lenses, "lens_type") : fallback("lens_type", (v) => v !== "cosmetic");
  const brands = mergeBrands(frames, lenses);
  const secondary = (home?.secondary ?? []).filter((b) => imageSrc(b.image_url) && isInternalHref(b.cta_href));

  return (
    <>
      <Hero home={home} hasFrames={hasFrames} />

      <HomeMosaic hasFrames={hasFrames} uses={uses} needs={needs} content={mosaicContent(home)} />

      {frameProducts.length > 0 && (
        <div className="mt-8 bg-secondary">
          <ProductRow title={t("home.featuredFrames")} href="/armazones" products={frameProducts} className="py-10" />
        </div>
      )}

      {shapes.length > 0 && (
        <section className="container-page space-y-4 pt-12 pb-4">
          <h2 className="text-2xl">{t("home.byShape")}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {shapes.map(([shape, label]) => (
              <li key={shape}>
                <Link href={`/armazones?shape=${shape}`} className="flex h-full flex-col items-center gap-2 rounded-2xl bg-secondary p-5 text-center font-medium transition-colors hover:bg-accent hover:text-primary">
                  <FrameShapeIcon shape={shape} className="h-10 text-primary" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {priceBands.length > 0 && (
        <section className="container-page space-y-4 py-8">
          <h2 className="text-2xl">{t("home.byPrice")}</h2>
          <ul className="flex flex-wrap gap-2">
            {priceBands.map((band) => (
              <li key={band}>
                <Link href={`/armazones?max_price_cents=${band}`} className="inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:border-primary hover:bg-accent">
                  {priceBandLabel(band)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductRow title={t("home.featuredLenses")} href="/lentes" products={lensProducts} />

      {secondary.length > 0 && (
        <section aria-label={t("home.promotionsLabel")} className="container-page py-8">
          <ul className="grid gap-4 md:grid-cols-3">
            {secondary.map((b) => (
              <li key={b.id}>
                <Link href={b.cta_href!} className="group block overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary">
                  <span className="relative block aspect-[4/3] bg-secondary">
                    <Image src={imageSrc(b.image_url)!} alt={b.image_alt ?? ""} fill unoptimized className="object-cover" />
                  </span>
                  <span className="block space-y-1 p-4">
                    <span className="block font-display text-lg font-semibold">{b.title}</span>
                    {b.subtitle && <span className="block text-sm text-muted-foreground">{b.subtitle}</span>}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">{b.cta_label} <ArrowRight className="size-4" aria-hidden="true" /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brands.length > 0 && (
        <section className="container-page space-y-4 py-8">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl">{t("brands.title")}</h2>
            <Link href="/marcas" className="text-sm font-medium text-primary hover:underline">{t("home.viewAllBrands")}</Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <li key={b.slug}>
                <Link href={`/marcas/${b.slug}`} className="inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:border-primary hover:bg-accent">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
