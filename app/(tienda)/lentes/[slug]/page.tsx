import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductViewTracker } from "@/components/tienda/product-view-tracker";
import { RxSelector } from "@/components/tienda/rx-selector";
import { Badge } from "@/components/ui/badge";
import { getProduct } from "@/lib/api/generated/api";
import { env } from "@/lib/env";
import { imageSrc } from "@/lib/images";
import { formatMxn, lensTypeLabel, productHref, replacementLabel } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const res = await getProduct(slug);
  return res.status === 200 ? res.data : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return {
    title: `${p.name} | ${p.brand.name}`,
    description: p.description ?? `Compra ${p.name} de ${p.brand.name}.`,
    alternates: { canonical: productHref(p) },
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  if (p.category !== "contact_lens") permanentRedirect(productHref(p));

  const images = p.images.map((i) => imageSrc(i.url)).filter((x): x is string => !!x);

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

  return (
    <div className="container-page grid gap-10 py-10 md:grid-cols-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductViewTracker slug={p.slug} name={p.name} brand={p.brand.name} />
      <div className="relative aspect-square animate-iris overflow-hidden rounded-2xl bg-secondary">
        {images[0] ? (
          <Image src={images[0]} alt={p.name} fill unoptimized className="object-contain p-8" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{p.brand.name}</p>
          <h1 className="text-3xl sm:text-4xl">{p.name}</h1>
          <div className="flex flex-wrap gap-2">
            {p.lens_type && <Badge variant="secondary">{lensTypeLabel[p.lens_type]}</Badge>}
            {p.replacement && <Badge variant="secondary">{replacementLabel[p.replacement]}</Badge>}
            {p.pieces_per_box != null && <Badge variant="outline">{p.pieces_per_box} piezas por caja</Badge>}
          </div>
          <p className="text-lg">
            {p.from_price_cents != null ? (
              <>Desde <strong className="font-display text-2xl">{formatMxn(p.from_price_cents)}</strong></>
            ) : (
              <strong>Agotado</strong>
            )}
          </p>
          {p.description && <p className="text-muted-foreground">{p.description}</p>}
          {p.requires_prescription && (
            <p className="text-sm">Requiere receta vigente de tu optometrista.</p>
          )}
        </div>
        <RxSelector product={p} />
      </div>
    </div>
  );
}
