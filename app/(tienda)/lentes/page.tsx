import type { Metadata } from "next";
import { CatalogFilters } from "@/components/tienda/catalog-filters";
import { ProductCard } from "@/components/tienda/product-card";
import { listBrands, listProducts } from "@/lib/api/generated/api";
import type { LensType, Replacement } from "@/lib/api/generated/model";

export const metadata: Metadata = {
  title: "Catálogo de lentes de contacto",
  description: "Lentes de contacto diarios, quincenales y mensuales de las mejores marcas.",
};

type SearchParams = Promise<{ brand?: string; lens_type?: string; replacement?: string }>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [products, brands] = await Promise.all([
    listProducts({
      brand: params.brand,
      lens_type: params.lens_type as LensType | undefined,
      replacement: params.replacement as Replacement | undefined,
    }),
    listBrands(),
  ]);
  const items = products.status === 200 ? products.data.items : [];
  const brandList = brands.status === 200 ? brands.data.items : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Lentes de contacto</h1>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <CatalogFilters params={params} brands={brandList} />
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
