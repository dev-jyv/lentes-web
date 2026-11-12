import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/tienda/breadcrumbs";
import { ProductGallery } from "@/components/tienda/product-gallery";
import { ProductViewTracker } from "@/components/tienda/product-view-tracker";
import { RxSelector } from "@/components/tienda/rx-selector";
import { getProduct } from "@/lib/api/generated/api";
import { env } from "@/lib/env";
import { imageSrc } from "@/lib/images";
import { productHref } from "@/lib/format";
import { loadCatalog } from "@/lib/storefront";
import { t } from "@/lib/i18n";
import { FavoriteButton } from "@/components/tienda/favorite-button";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const res = await getProduct(slug);
  return res.status === 200 ? res.data : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return {
    title: t("product.metaTitle", { name: p.name, brand: p.brand.name }),
    description: p.description ?? t("lenses.metaDescription", { name: p.name, brand: p.brand.name }),
    alternates: { canonical: productHref(p) },
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  if (p.category !== "contact_lens") permanentRedirect(productHref(p));

  const images = [...p.images].sort((a, b) => a.position - b.position).map((i) => imageSrc(i.url)).filter((x): x is string => !!x);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description ?? undefined,
    brand: { "@type": "Brand", name: p.brand.name },
    image: images,
    url: `${env.siteUrl}/lentes/${p.slug}`,
    // El precio lo calcula la API; sin existencias no se declara oferta.
    ...(p.from_price_cents != null && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "MXN",
        lowPrice: (p.from_price_cents / 100).toFixed(2),
        availability: "https://schema.org/InStock",
        url: `${env.siteUrl}/lentes/${p.slug}`,
      },
    }),
  };

  const catalog = await loadCatalog();
  const brandHref = `/marcas/${p.brand.slug}`;
  const yesNo = (v: boolean | null) => (v == null ? null : v ? t("lenses.yes") : t("lenses.no"));
  // Filas de "Detalles del lente"; las que no tienen valor no se muestran.
  const details = [
    [t("lenses.details.lensType"), p.lens_type && catalog.label("lens_type", p.lens_type)],
    [t("lenses.details.replacement"), p.replacement && catalog.label("replacement", p.replacement)],
    [t("lenses.details.piecesPerBox"), p.pieces_per_box],
    [t("lenses.details.material"), p.material],
    [t("lenses.details.waterContent"), p.water_content_pct != null ? t("lenses.waterContentValue", { value: p.water_content_pct }) : null],
    [t("lenses.details.uvBlocking"), yesNo(p.uv_blocking)],
    [t("lenses.details.visibilityTint"), yesNo(p.visibility_tint)],
    [t("lenses.details.packageNote"), p.package_note],
    [t("lenses.details.brand"), p.brand.name],
    [t("lenses.details.manufacturer"), p.manufacturer],
  ].filter(([, v]) => v != null && v !== "");

  return (
    <div className="container-page space-y-10 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductViewTracker slug={p.slug} name={p.name} brand={p.brand.name} />
      <Breadcrumbs items={[
        { label: t("common.home"), href: "/" },
        { label: t("lenses.breadcrumb"), href: "/lentes" },
        { label: p.brand.name, href: brandHref },
        { label: p.name },
      ]} />
      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={images} alt={p.name} />
        <div className="space-y-6">
          <div className="space-y-2">
            <Link href={brandHref} className="text-sm font-medium text-primary hover:underline">{p.brand.name}</Link>
            <h1 className="text-3xl sm:text-4xl">{p.name}</h1>
            <FavoriteButton productId={p.id} name={p.name} className="-ml-2" />
            {p.manufacturer && (
              <p className="text-sm text-muted-foreground">{t("lenses.manufacturer", { name: p.manufacturer })}</p>
            )}
            {p.requires_prescription && <p className="text-sm">{t("lenses.requiresPrescription")}</p>}
          </div>
          <RxSelector product={p} />
        </div>
      </div>
      <div className="grid gap-10 border-t pt-10 md:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-2xl">{t("lenses.detailsTitle")}</h2>
          <dl className="divide-y text-sm">
            {details.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="space-y-4">
          {p.description && (
            <>
              <h2 className="text-2xl">{t("lenses.aboutTitle", { name: p.name })}</h2>
              <p className="text-muted-foreground">{p.description}</p>
            </>
          )}
          <Link href={brandHref} className="inline-block text-sm font-medium text-primary hover:underline">
            {t("lenses.allFromBrand", { brand: p.brand.name })}
          </Link>
        </section>
      </div>
    </div>
  );
}
