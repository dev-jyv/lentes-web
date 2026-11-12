import type { Metadata } from "next";
import { ActiveFilters, CatalogFilters, type FilterGroup } from "@/components/tienda/catalog-filters";
import { ProductCard } from "@/components/tienda/product-card";
import { listBrands, listProducts } from "@/lib/api/generated/api";
import { LensType, Replacement } from "@/lib/api/generated/model";
import { facetOptions } from "@/lib/catalog";
import { pickKey } from "@/lib/format";
import { loadCatalog, loadFacets } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("lenses.metaTitle"),
  description: t("lenses.description"),
};

type SearchParams = Promise<{ brand?: string; lens_type?: string; replacement?: string }>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const [brands, facets, catalog] = await Promise.all([
    listBrands({ category: "contact_lens" }).catch(() => null),
    loadFacets("contact_lens"),
    loadCatalog(),
  ]);
  const brandList = brands?.status === 200 ? brands.data.items : [];
  // Solo valores conocidos: un filtro inválido en la URL se ignora.
  const params = {
    brand: brandList.some((b) => b.slug === raw.brand) ? raw.brand : undefined,
    lens_type: pickKey(LensType, raw.lens_type),
    replacement: pickKey(Replacement, raw.replacement),
  };
  const products = await listProducts({
    category: "contact_lens",
    brand: params.brand,
    lens_type: params.lens_type,
    replacement: params.replacement,
  }).catch(() => null);
  const failed = products?.status !== 200;
  const items = products?.status === 200 ? products.data.items : [];
  // Solo valores con productos en toda la categoría, más el seleccionado (SPEC 16, punto 17).
  const groups: FilterGroup[] = [
    { title: t("catalog.filters.brand"), name: "brand", options: brandList.map((b) => ({ value: b.slug, label: b.name })) },
    { title: t("catalog.filters.type"), name: "lens_type", options: facetOptions(catalog, "lens_type", facets?.values.lens_type, params.lens_type) },
    { title: t("catalog.filters.replacement"), name: "replacement", options: facetOptions(catalog, "replacement", facets?.values.replacement, params.replacement) },
  ].filter((g) => g.options.length > 0);

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl">{t("common.contactLenses")}</h1>
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <CatalogFilters base="/lentes" params={params} groups={groups} />
        <div>
          <ActiveFilters base="/lentes" params={params} groups={groups} />
          {failed ? (
            <p role="alert" className="text-muted-foreground">{t("lenses.loadFailed")}</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">{t("catalog.noLensesFiltered")}</p>
          ) : (
            <>
              <p className="optic mb-4 text-sm text-muted-foreground">{t("catalog.productCount", { count: items.length })}</p>
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
