import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogFilters, toOptions, type FilterGroup } from "@/components/tienda/catalog-filters";
import { ProductCard } from "@/components/tienda/product-card";
import { listBrands, listProducts } from "@/lib/api/generated/api";
import type { LensType, Replacement } from "@/lib/api/generated/model";
import { lensTypeLabel, pickKey, replacementLabel } from "@/lib/format";
import { t } from "@/lib/i18n";

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
    ? { title: brand.name, description: t("brands.metaDescription", { brand: brand.name }) }
    : {};
}

const groups: FilterGroup[] = [
  { title: t("catalog.filters.type"), name: "lens_type", options: toOptions(lensTypeLabel) },
  { title: t("catalog.filters.replacement"), name: "replacement", options: toOptions(replacementLabel) },
];

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const filters = {
    lens_type: pickKey(lensTypeLabel, raw.lens_type),
    replacement: pickKey(replacementLabel, raw.replacement),
  };
  const [frames, lenses] = await Promise.all([
    listProducts({ brand: slug, category: "frame" }),
    listProducts({
      brand: slug,
      category: "contact_lens",
      lens_type: filters.lens_type as LensType | undefined,
      replacement: filters.replacement as Replacement | undefined,
    }),
  ]);
  const frameItems = frames.status === 200 ? frames.data.items : [];
  const lensItems = lenses.status === 200 ? lenses.data.items : [];
  const filtering = Boolean(filters.lens_type || filters.replacement);

  return (
    <div className="container-page space-y-10 py-10">
      <h1 className="text-3xl">{brand.name}</h1>
      {frameItems.length > 0 && (
        <section aria-labelledby="marca-armazones" className="space-y-4">
          <h2 id="marca-armazones" className="text-2xl">{t("common.frames")}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {frameItems.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
      {(lensItems.length > 0 || filtering) && (
        <section aria-labelledby="marca-lentes" className="space-y-4">
          <h2 id="marca-lentes" className="text-2xl">{t("common.contactLenses")}</h2>
          <div className="grid gap-8 md:grid-cols-[250px_1fr]">
            <CatalogFilters base={`/marcas/${slug}`} params={filters} groups={groups} />
            {lensItems.length === 0 ? (
              <p className="text-muted-foreground">{t("catalog.noLensesFiltered")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {lensItems.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </section>
      )}
      {frameItems.length === 0 && lensItems.length === 0 && !filtering && (
        <p className="text-muted-foreground">{t("brands.noProducts")}</p>
      )}
    </div>
  );
}
