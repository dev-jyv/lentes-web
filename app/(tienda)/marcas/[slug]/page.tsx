import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogFilters } from "@/components/tienda/catalog-filters";
import { ProductCard } from "@/components/tienda/product-card";
import { listBrands, listProducts } from "@/lib/api/generated/api";
import type { LensType, Replacement } from "@/lib/api/generated/model";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lens_type?: string; replacement?: string }>;
};

async function getBrand(slug: string) {
  const res = await listBrands();
  return res.status === 200 ? res.data.items.find((b) => b.slug === slug) : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await getBrand((await params).slug);
  return brand
    ? { title: `Lentes de contacto ${brand.name}`, description: `Compra lentes ${brand.name} en línea.` }
    : {};
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const filters = await searchParams;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const res = await listProducts({
    brand: slug,
    lens_type: filters.lens_type as LensType | undefined,
    replacement: filters.replacement as Replacement | undefined,
  });
  const items = res.status === 200 ? res.data.items : [];

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl">{brand.name}</h1>
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <CatalogFilters base={`/marcas/${slug}`} params={filters} brands={[]} />
        {items.length === 0 ? (
          <p className="text-muted-foreground">No encontramos lentes con esos filtros.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
