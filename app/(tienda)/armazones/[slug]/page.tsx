import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BadgeCheck, Check, MonitorSmartphone, Package, ShieldCheck, Sparkles, SunDim, Wrench } from "lucide-react";
import { Breadcrumbs } from "@/components/tienda/breadcrumbs";
import { FrameMeasuresDiagram } from "@/components/tienda/frame-measures-diagram";
import { FrameSelection, FrameSelector, SelectedColor } from "@/components/tienda/frame-selector";
import { ProductGallery } from "@/components/tienda/product-gallery";
import { ProductViewTracker } from "@/components/tienda/product-view-tracker";
import { getProduct } from "@/lib/api/generated/api";
import { env } from "@/lib/env";
import { productHref } from "@/lib/format";
import { imageSrc } from "@/lib/images";
import { loadCatalog } from "@/lib/storefront";
import { t } from "@/lib/i18n";
import { FavoriteButton } from "@/components/tienda/favorite-button";

type Props = { params: Promise<{ slug: string }> };

// Íconos de los valores de "qué incluye" que ya existían; uno nuevo del admin (SPEC 16) lleva una palomita genérica.
const includeIcon: Record<string, typeof Package> = {
  case: Package, cleaning_cloth: Sparkles, scratch_resistant: ShieldCheck, warranty: BadgeCheck,
  blue_light_filter: MonitorSmartphone, anti_reflective: SunDim, optician_fitting: Wrench,
};

async function load(slug: string) {
  const res = await getProduct(slug);
  return res.status === 200 ? res.data : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return {
    title: t("product.metaTitle", { name: p.name, brand: p.brand.name }),
    description: p.description ?? t("frames.metaDescription", { name: p.name, brand: p.brand.name }),
    alternates: { canonical: productHref(p) },
  };
}

export default async function FramePage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  if (p.category !== "frame" || !p.frame) permanentRedirect(productHref(p));
  const catalog = await loadCatalog();

  const images = p.images.map((i) => imageSrc(i.url)).filter((x): x is string => !!x);
  const url = `${env.siteUrl}${productHref(p)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description ?? undefined,
    brand: { "@type": "Brand", name: p.brand.name },
    image: images,
    url,
    // El precio lo calcula la API; sin existencias no se declara oferta.
    ...(p.from_price_cents != null && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "MXN",
        lowPrice: (p.from_price_cents / 100).toFixed(2),
        availability: "https://schema.org/InStock",
        url,
      },
    }),
  };
  const { frame } = p;
  const size = frame.size ? catalog.label("frame_size", frame.size) : undefined;
  const mm = (value: number | null) => value != null && t("frames.measures.value", { value });
  const measures = [
    { label: t("frames.measures.lensWidth"), value: mm(frame.lens_width_mm) },
    { label: t("frames.measures.bridge"), value: mm(frame.bridge_mm) },
    { label: t("frames.measures.temple"), value: mm(frame.temple_mm) },
    { label: t("frames.measures.lensHeight"), value: mm(frame.lens_height_mm) },
    { label: t("frames.measures.frameWidth"), value: mm(frame.frame_width_mm) },
    { label: t("frames.measures.weight"), value: frame.weight_g != null && t("frames.measures.weightValue", { value: frame.weight_g }) },
  ].filter((m) => m.value);
  // En el orden del catálogo; un valor oculto conserva su etiqueta y va al final (SPEC 16, puntos 10 y 11).
  const includeOrder = catalog.entries("frame_include").map((e) => e.code);
  const rank = (code: string) => (includeOrder.includes(code) ? includeOrder.indexOf(code) : includeOrder.length);
  const includes = [...frame.includes].sort((a, b) => rank(a) - rank(b));
  const yesNo = (v: boolean | null) => v != null && t(v ? "frames.features.yes" : "frames.features.no");
  const features = [
    { label: t("frames.features.size"), value: size },
    { label: t("frames.features.gender"), value: catalog.label("frame_gender", frame.gender) },
    { label: t("frames.features.material"), value: catalog.label("frame_material", frame.material) },
    { label: t("frames.features.rim"), value: catalog.label("frame_rim", frame.rim) },
    { label: t("frames.features.shape"), value: catalog.label("frame_shape", frame.shape) },
    { label: t("frames.features.color"), value: p.frame_variants.length > 0 && <SelectedColor variants={p.frame_variants} /> },
    { label: t("frames.features.springHinges"), value: yesNo(frame.spring_hinges) },
    { label: t("frames.features.adjustableNosePads"), value: yesNo(frame.adjustable_nose_pads) },
    { label: t("frames.features.progressiveEligible"), value: yesNo(frame.progressive_eligible) },
  ].filter((f) => f.value);

  return (
    <div className="container-page space-y-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductViewTracker slug={p.slug} name={p.name} brand={p.brand.name} />
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("common.frames"), href: "/armazones" },
          { label: p.brand.name, href: `/marcas/${p.brand.slug}` },
          { label: p.name },
        ]}
      />
      <FrameSelection variants={p.frame_variants}>
        <div className="grid gap-10 lg:grid-cols-2">
          <ProductGallery images={images} alt={p.name} />
          <div className="space-y-6">
            <div className="space-y-1">
              <Link href={`/marcas/${p.brand.slug}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                {p.brand.name}
              </Link>
              <h1 className="text-3xl sm:text-4xl">{p.name}</h1>
              <FavoriteButton productId={p.id} name={p.name} className="-ml-2" />
              {size && <p className="text-muted-foreground">{t("frames.sizeHeading", { size: size.toLowerCase() })}</p>}
            </div>
            <FrameSelector product={p} />
            {includes.length > 0 && (
              <section aria-labelledby="incluye">
                <h2 id="incluye" className="mb-3 text-base">{t("frames.includes.title")}</h2>
                <ul className="grid gap-2 text-sm sm:grid-cols-2">
                  {includes.map((i) => {
                    const Icon = Object.hasOwn(includeIcon, i) ? includeIcon[i] : Check;
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        {i === "warranty" && frame.warranty_months != null
                          ? t("frames.includes.warrantyMonths", { count: frame.warranty_months })
                          : catalog.label("frame_include", i)}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>

        <div className="grid gap-10 border-t pt-8 lg:grid-cols-2">
          <section aria-labelledby="medidas" className="space-y-4">
            <h2 id="medidas" className="text-base">{t("frames.measures.title")}</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {measures.map((m) => (
                <div key={m.label} className="rounded-xl border p-3">
                  <dt className="text-muted-foreground">{m.label}</dt>
                  <dd className="optic font-medium">{m.value}</dd>
                </div>
              ))}
            </dl>
            <FrameMeasuresDiagram />
          </section>
          <section aria-labelledby="caracteristicas" className="space-y-4">
            <h2 id="caracteristicas" className="text-base">{t("frames.features.title")}</h2>
            <dl className="divide-y text-sm">
              {features.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </FrameSelection>

      {p.description && (
        <section aria-labelledby="acerca" className="space-y-2 border-t pt-8">
          <h2 id="acerca" className="text-base">{t("frames.about", { name: p.name })}</h2>
          <p className="max-w-prose text-muted-foreground">{p.description}</p>
        </section>
      )}
    </div>
  );
}
