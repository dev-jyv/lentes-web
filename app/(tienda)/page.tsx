import { ArrowRight, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FrameShapeIcon } from "@/components/tienda/frame-shape-icon";
import { HeroLens } from "@/components/tienda/hero-lens";
import { ProductCard } from "@/components/tienda/product-card";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/api/generated/api";
import type { FrameShape, HomeBanner, Product } from "@/lib/api/generated/model";
import { BRAND } from "@/lib/brand";
import { lensNeedLabel, replacementLabel, shapeLabel } from "@/lib/format";
import { imageSrc } from "@/lib/images";
import { FRAME_PRICE_BANDS, mergeBrands, priceBandLabel } from "@/lib/navigation";
import { isInternalHref } from "@/lib/safe-next";
import { loadFacets, loadHome } from "@/lib/storefront";

const promises = [
  { icon: FileCheck2, title: "Receta revisada", text: "Revisamos tu receta antes de enviar tus lentes." },
  { icon: RefreshCw, title: "Reposición en un clic", text: "Repite un pedido anterior sin volver a elegir tu graduación." },
  { icon: ShieldCheck, title: "Pago seguro", text: "Paga con tarjeta, OXXO o SPEI a través de Mercado Pago." },
];

const tileClass =
  "flex h-full min-h-16 items-center justify-between gap-2 rounded-xl border bg-card p-4 font-display font-semibold transition-colors hover:border-primary hover:bg-accent";

// Destacados elegidos en el admin; si aún no hay, los más recientes para no dejar el home vacío.
async function featuredOrNewest(featured: Product[] | undefined, category: Product["category"]) {
  if (featured?.length) return featured;
  const res = await listProducts({ category, limit: 4 }).catch(() => null);
  return res?.status === 200 ? res.data.items : [];
}

function BannerCta({ banner }: { banner: HomeBanner }) {
  if (!banner.cta_label || !isInternalHref(banner.cta_href)) return null;
  return (
    <Button size="lg" render={<Link href={banner.cta_href} />} nativeButton={false}>
      {banner.cta_label} <ArrowRight className="size-5" aria-hidden="true" />
    </Button>
  );
}

function Hero({ banner, hasFrames }: { banner: HomeBanner | null | undefined; hasFrames: boolean }) {
  const src = imageSrc(banner?.image_url);
  if (banner && src) {
    return (
      <section className="container-page grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="space-y-6">
          <h1 className="text-4xl leading-[1.05] sm:text-5xl xl:text-6xl">{banner.title}</h1>
          {banner.subtitle && <p className="max-w-xl text-lg text-muted-foreground">{banner.subtitle}</p>}
          <BannerCta banner={banner} />
        </div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
          <Image src={src} alt={banner.image_alt ?? ""} fill unoptimized priority className="object-cover" />
        </div>
      </section>
    );
  }
  return (
    <section className="container-page grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
      <div className="space-y-6">
        <p className="optic text-xs font-medium tracking-widest text-primary uppercase">Receta · marca · graduación</p>
        <h1 className="text-4xl leading-[1.05] sm:text-5xl xl:text-6xl">
          {hasFrames ? <>Tu vista, con <em className="text-warn not-italic dark:text-amber">tu</em> estilo.</> : <>Lentes de contacto que llegan <em className="text-warn not-italic dark:text-amber">antes</em> de que se acaben.</>}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {hasFrames
            ? `Armazones y lentes de contacto en un solo lugar. En ${BRAND.name} revisamos tu receta antes del envío.`
            : `Elige tu marca, captura tu graduación y repón en un clic. En ${BRAND.name} revisamos tu receta antes del envío.`}
        </p>
        <div className="flex flex-wrap gap-3">
          {hasFrames && (
            <Button size="lg" render={<Link href="/armazones" />} nativeButton={false}>
              Ver armazones <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          )}
          <Button size="lg" variant={hasFrames ? "outline" : "default"} render={<Link href="/lentes" />} nativeButton={false}>
            Ver lentes de contacto {!hasFrames && <ArrowRight className="size-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>
      <HeroLens />
    </section>
  );
}

function ProductRow({ title, href, products }: { title: string; href: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-page space-y-4 py-8">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl">{title}</h2>
        <Link href={href} className="text-sm font-medium text-primary hover:underline">Ver todo</Link>
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
  const secondary = (home?.secondary ?? []).filter((b) => imageSrc(b.image_url) && isInternalHref(b.cta_href));

  return (
    <>
      <Hero banner={home?.hero} hasFrames={hasFrames} />

      <section aria-label="Categorías" className="container-page pb-10">
        <ul className={`grid gap-4 ${hasFrames ? "md:grid-cols-2" : ""}`}>
          {hasFrames && (
            <li>
              <Link href="/armazones" className="group block rounded-2xl border bg-card p-6 transition-colors hover:border-primary hover:bg-accent">
                <FrameShapeIcon shape="round" className="mb-4 h-14 text-primary" />
                <h2 className="text-2xl">Armazones</h2>
                <p className="text-sm text-muted-foreground">Busca por forma, material, color y precio.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Ver armazones <ArrowRight className="size-4" aria-hidden="true" /></span>
              </Link>
            </li>
          )}
          <li>
            <Link href="/lentes" className="group block rounded-2xl border bg-card p-6 transition-colors hover:border-primary hover:bg-accent">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="mb-4 h-14 text-primary">
                <circle cx="24" cy="24" r="19" />
                <path d="M9 30c6 5 24 5 30 0" />
              </svg>
              <h2 className="text-2xl">Lentes de contacto</h2>
              <p className="text-sm text-muted-foreground">Diarios, mensuales, para astigmatismo y más.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Ver lentes de contacto <ArrowRight className="size-4" aria-hidden="true" /></span>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-label="Promesas" className="border-y bg-card">
        <ul className="container-page grid gap-6 py-8 md:grid-cols-3">
          {promises.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {shapes.length > 0 && (
        <section className="container-page space-y-4 pt-12 pb-4">
          <h2 className="text-2xl">Comprar armazones por forma</h2>
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
          <h2 className="text-2xl">Comprar armazones por precio</h2>
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

      <ProductRow title="Armazones destacados" href="/armazones" products={frameProducts} />

      <section className="container-page space-y-4 py-8">
        <h2 className="text-2xl">Comprar lentes de contacto</h2>
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

      <ProductRow title="Lentes de contacto destacados" href="/lentes" products={lensProducts} />

      {secondary.length > 0 && (
        <section aria-label="Promociones" className="container-page py-8">
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
            <h2 className="text-2xl">Marcas</h2>
            <Link href="/marcas" className="text-sm font-medium text-primary hover:underline">Ver todas</Link>
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
