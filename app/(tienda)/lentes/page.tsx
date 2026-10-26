import type { Metadata } from "next";
import { ActiveFilters, CatalogFilters } from "@/components/tienda/catalog-filters";
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
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl">Lentes de contacto</h1>
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <CatalogFilters params={params} brands={brandList} />
        <div>
          <ActiveFilters params={params} brands={brandList} />
          {items.length === 0 ? (
            <p className="text-muted-foreground">No encontramos lentes con esos filtros.</p>
          ) : (
            <>
              <p className="optic mb-4 text-sm text-muted-foreground">{items.length} {items.length === 1 ? "producto" : "productos"}</p>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
