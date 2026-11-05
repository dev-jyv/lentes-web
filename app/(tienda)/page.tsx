import { ArrowRight, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FrameShapeIcon } from "@/components/tienda/frame-shape-icon";
import { HeroCarousel } from "@/components/tienda/hero-carousel";
import { HeroLens } from "@/components/tienda/hero-lens";
import { ProductCard } from "@/components/tienda/product-card";
import { listProducts } from "@/lib/api/generated/api";
import type { FrameShape, HomeBanner, Product } from "@/lib/api/generated/model";
import { lensNeedLabel, replacementLabel, shapeLabel } from "@/lib/format";
import { imageSrc } from "@/lib/images";
import { FRAME_PRICE_BANDS, mergeBrands, priceBandLabel } from "@/lib/navigation";
import { isInternalHref } from "@/lib/safe-next";
import { loadFacets, loadHome } from "@/lib/storefront";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

const promises = [
  { icon: FileCheck2, title: t("home.promises.prescription") },
  { icon: RefreshCw, title: t("home.promises.reorder") },
  { icon: ShieldCheck, title: t("home.promises.payment") },
];

const slideCta = "inline-flex h-12 items-center justify-center rounded-full bg-white px-8 font-semibold text-band transition-colors hover:bg-white/85";

const tileClass =
  "flex h-full min-h-16 items-center justify-between gap-2 rounded-xl border bg-card p-4 font-display font-semibold transition-colors hover:border-primary hover:bg-accent";

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

// Diapositiva de marca: se usa mientras el admin no publique banners principales con imagen.
function DefaultSlide({ first, title, subtitle, art, children }: { first: boolean; title: React.ReactNode; subtitle: string; art: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center bg-band bg-[radial-gradient(circle_at_78%_50%,color-mix(in_srgb,var(--blue-vivid)_55%,transparent),transparent_60%)]">
      <div className="container-page flex items-center">
        <SlideText first={first} title={title} subtitle={subtitle}>{children}</SlideText>
        <div className="hidden w-1/2 justify-center text-white lg:flex">{art}</div>
      </div>
    </div>
  );
}

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

function Hero({ banners, hasFrames }: { banners: HomeBanner[]; hasFrames: boolean }) {
  const slides = banners.length
    ? banners.map((banner, i) => <BannerSlide key={banner.id} banner={banner} first={i === 0} />)
    : defaultSlides(hasFrames);
  return (
    <>
      <HeroCarousel>{slides}</HeroCarousel>
      <section aria-label={t("home.promisesLabel")} className="container-page relative z-10 -mt-7">
        <ul className="grid gap-3 rounded-3xl border bg-card px-6 py-4 shadow-md md:grid-cols-3 md:divide-x md:rounded-full">
          {promises.map(({ icon: Icon, title }) => (
            <li key={title} className="flex items-center gap-3 font-medium md:justify-center md:px-4">
              <Icon className="size-6 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm lg:text-base">{title}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ProductRow({ title, href, products }: { title: string; href: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-page space-y-4 py-8">
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
  const [home, frames, lenses] = await Promise.all([loadHome(), loadFacets("frame"), loadFacets("contact_lens")]);
  const hasFrames = (frames?.total ?? 0) > 0;
  const [frameProducts, lensProducts] = await Promise.all([
    hasFrames ? featuredOrNewest(home?.featured.frame, "frame") : Promise.resolve([]),
    featuredOrNewest(home?.featured.contact_lens, "contact_lens"),
  ]);

  const has = (facet: typeof frames, key: string, value: string) => facet?.values[key]?.some((v) => v.value === value) ?? false;
  const shapes = (Object.keys(shapeLabel) as FrameShape[]).filter((s) => has(frames, "shape", s));
  const minFramePrice = frames?.min_price_cents;
  const priceBands = minFramePrice == null ? [] : FRAME_PRICE_BANDS.filter((band) => band >= minFramePrice);
  // Sin datos del catálogo (API caída) quedan solo los enlaces fijos que el home ya ofrecía.
  const uses = Object.entries(replacementLabel).filter(([v]) => (lenses ? has(lenses, "replacement", v) : v === "daily" || v === "monthly"));
  const needs = Object.entries(lensNeedLabel).filter(([v]) => (lenses ? has(lenses, "lens_type", v) : v !== "cosmetic"));
  const brands = mergeBrands(frames, lenses);
  // `hero` cubre a una API que aún no publique `heroes`. Un banner sin imagen no entra al carrusel.
  const heroes = (home?.heroes ?? (home?.hero ? [home.hero] : [])).filter((b) => imageSrc(b.image_url));
  const secondary = (home?.secondary ?? []).filter((b) => imageSrc(b.image_url) && isInternalHref(b.cta_href));

  return (
    <>
      <Hero banners={heroes} hasFrames={hasFrames} />

      <section aria-label={t("home.categoriesLabel")} className="container-page pt-10 pb-4">
        <ul className={`grid gap-4 ${hasFrames ? "md:grid-cols-2" : ""}`}>
          {hasFrames && (
            <li>
              <Link href="/armazones" className="group block rounded-2xl border bg-card p-6 transition-colors hover:border-primary hover:bg-accent">
                <FrameShapeIcon shape="round" className="mb-4 h-14 text-primary" />
                <h2 className="text-2xl">{t("common.frames")}</h2>
                <p className="text-sm text-muted-foreground">{t("home.framesBlurb")}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">{t("common.viewFrames")} <ArrowRight className="size-4" aria-hidden="true" /></span>
              </Link>
            </li>
          )}
          <li>
            <Link href="/lentes" className="group block rounded-2xl border bg-card p-6 transition-colors hover:border-primary hover:bg-accent">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="mb-4 h-14 text-primary">
                <circle cx="24" cy="24" r="19" />
                <path d="M9 30c6 5 24 5 30 0" />
              </svg>
              <h2 className="text-2xl">{t("common.contactLenses")}</h2>
              <p className="text-sm text-muted-foreground">{t("home.lensesBlurb")}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">{t("common.viewContactLenses")} <ArrowRight className="size-4" aria-hidden="true" /></span>
            </Link>
          </li>
        </ul>
      </section>

      {shapes.length > 0 && (
        <section className="container-page space-y-4 pt-12 pb-4">
          <h2 className="text-2xl">{t("home.byShape")}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {shapes.map((shape) => (
              <li key={shape}>
                <Link href={`/armazones?shape=${shape}`} className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center font-medium transition-colors hover:border-primary hover:bg-accent">
                  <FrameShapeIcon shape={shape} className="h-10 text-primary" />
                  {shapeLabel[shape]}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {priceBands.length > 0 && (
        <section className="container-page space-y-4 py-8">
          <h2 className="text-2xl">{t("home.byPrice")}</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {priceBands.map((band) => (
              <li key={band}>
                <Link href={`/armazones?max_price_cents=${band}`} className={tileClass}>
                  {priceBandLabel(band)} <ArrowRight className="size-5 text-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductRow title={t("home.featuredFrames")} href="/armazones" products={frameProducts} />

      <section className="container-page space-y-4 py-8">
        <h2 className="text-2xl">{t("home.buyLenses")}</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {uses.map(([value, label]) => (
            <li key={value}>
              <Link href={`/lentes?replacement=${value}`} className={tileClass}>
                {label} <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
          {needs.map(([value, label]) => (
            <li key={value}>
              <Link href={`/lentes?lens_type=${value}`} className={tileClass}>
                {label} <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
