import type { Metadata } from "next";
import { ActiveFilters, CatalogFilters, toOptions, type FilterGroup } from "@/components/tienda/catalog-filters";
import { ProductCard } from "@/components/tienda/product-card";
import { listBrands, listProducts } from "@/lib/api/generated/api";
import type { LensType, Replacement } from "@/lib/api/generated/model";
import { lensTypeLabel, pickKey, replacementLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Catálogo de lentes de contacto",
  description: "Lentes de contacto diarios, quincenales y mensuales de las mejores marcas.",
};

type SearchParams = Promise<{ brand?: string; lens_type?: string; replacement?: string }>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const brands = await listBrands({ category: "contact_lens" }).catch(() => null);
  const brandList = brands?.status === 200 ? brands.data.items : [];
  // Solo valores conocidos: un filtro inválido en la URL se ignora.
  const params = {
    brand: brandList.some((b) => b.slug === raw.brand) ? raw.brand : undefined,
    lens_type: pickKey(lensTypeLabel, raw.lens_type),
    replacement: pickKey(replacementLabel, raw.replacement),
  };
  const products = await listProducts({
    category: "contact_lens",
    brand: params.brand,
    lens_type: params.lens_type as LensType | undefined,
    replacement: params.replacement as Replacement | undefined,
  }).catch(() => null);
  const failed = products?.status !== 200;
  const items = products?.status === 200 ? products.data.items : [];
  const groups: FilterGroup[] = [
    { title: "Marca", name: "brand", options: brandList.map((b) => ({ value: b.slug, label: b.name })) },
    { title: "Tipo", name: "lens_type", options: toOptions(lensTypeLabel) },
    { title: "Reemplazo", name: "replacement", options: toOptions(replacementLabel) },
  ];

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl">Lentes de contacto</h1>
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <CatalogFilters base="/lentes" params={params} groups={groups} />
        <div>
          <ActiveFilters base="/lentes" params={params} groups={groups} />
          {failed ? (
            <p role="alert" className="text-muted-foreground">No pudimos cargar los lentes. Intenta de nuevo en unos minutos.</p>
          ) : items.length === 0 ? (
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
