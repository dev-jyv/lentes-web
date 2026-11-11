import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { FrameSelector } from "@/components/tienda/frame-selector";
import { ProductViewTracker } from "@/components/tienda/product-view-tracker";
import { Badge } from "@/components/ui/badge";
import { getProduct } from "@/lib/api/generated/api";
import { env } from "@/lib/env";
import { frameMaterialLabel, genderLabel, productHref, rimLabel, shapeLabel } from "@/lib/format";
import { imageSrc } from "@/lib/images";
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
    description: p.description ?? t("frames.metaDescription", { name: p.name, brand: p.brand.name }),
    alternates: { canonical: productHref(p) },
  };
}

export default async function FramePage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  if (p.category !== "frame" || !p.frame) permanentRedirect(productHref(p));

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
  const measures = [
    { label: t("frames.measures.lensWidth"), value: frame.lens_width_mm },
    { label: t("frames.measures.bridge"), value: frame.bridge_mm },
    { label: t("frames.measures.temple"), value: frame.temple_mm },
  ];

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductViewTracker slug={p.slug} name={p.name} brand={p.brand.name} />
      <div className="space-y-3">
        <div className="relative aspect-square animate-iris overflow-hidden rounded-2xl bg-secondary">
          {images[0] ? (
            <Image src={images[0]} alt={p.name} fill unoptimized className="object-contain p-8" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("product.noImage")}</div>
          )}
        </div>
        {images.length > 1 && (
          <ul className="grid grid-cols-4 gap-3">
            {images.slice(1).map((src, i) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
                <Image src={src} alt={t("frames.imageView", { name: p.name, view: i + 2 })} fill unoptimized className="object-contain p-2" />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{p.brand.name}</p>
          <h1 className="text-3xl sm:text-4xl">{p.name}</h1>
          <FavoriteButton productId={p.id} name={p.name} className="-ml-2" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{shapeLabel[frame.shape]}</Badge>
            <Badge variant="secondary">{frameMaterialLabel[frame.material]}</Badge>
            <Badge variant="secondary">{rimLabel[frame.rim]}</Badge>
            <Badge variant="outline">{genderLabel[frame.gender]}</Badge>
          </div>
          {p.description && <p className="text-muted-foreground">{p.description}</p>}
        </div>
        <FrameSelector product={p} />
        <section aria-labelledby="medidas">
          <h2 id="medidas" className="mb-2 text-base">{t("frames.measures.title")}</h2>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {measures.map((m) => (
              <div key={m.label} className="rounded-xl border p-3">
                <dt className="text-muted-foreground">{m.label}</dt>
                <dd className="optic font-medium">{t("frames.measures.value", { value: m.value })}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
