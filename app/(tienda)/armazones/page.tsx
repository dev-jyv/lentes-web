import type { Metadata } from "next";
import { ActiveFilters, CatalogFilters, type FilterGroup } from "@/components/tienda/catalog-filters";
import { ProductCard } from "@/components/tienda/product-card";
import { listProducts } from "@/lib/api/generated/api";
import { catalogCode, facetOptions, type CatalogKind } from "@/lib/catalog";
import { formatMxn } from "@/lib/format";
import { FRAME_PRICE_BANDS, priceBandLabel } from "@/lib/navigation";
import { loadCatalog, loadFacets } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("common.frames"),
  description: t("frames.description"),
};

type SearchParams = Promise<Record<string, string | undefined>>;

// Un precio en la URL debe ser un entero positivo; lo demás se ignora.
const cents = (value: string | undefined) => (value && /^\d{1,12}$/.test(value) ? value : undefined);

export default async function FramesPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const [facets, catalog] = await Promise.all([loadFacets("frame"), loadCatalog()]);
  const brandList = facets?.brands ?? [];

  // Los atributos son catálogos administrables (SPEC 16): basta con que el código tenga el formato válido.
  // Un valor oculto sigue filtrando, así un enlace guardado muestra sus productos.
  const params = {
    brand: brandList.some((b) => b.slug === raw.brand) ? raw.brand : undefined,
    gender: catalogCode(raw.gender),
    shape: catalogCode(raw.shape),
    frame_material: catalogCode(raw.frame_material),
    rim: catalogCode(raw.rim),
    color: catalogCode(raw.color),
    min_price_cents: cents(raw.min_price_cents),
    max_price_cents: cents(raw.max_price_cents),
  };

  const res = await listProducts({
    category: "frame",
    brand: params.brand,
    gender: params.gender,
    shape: params.shape,
    frame_material: params.frame_material,
    rim: params.rim,
    color: params.color,
    min_price_cents: params.min_price_cents ? Number(params.min_price_cents) : undefined,
    max_price_cents: params.max_price_cents ? Number(params.max_price_cents) : undefined,
  }).catch(() => null);
  const failed = res?.status !== 200;
  const items = res?.status === 200 ? res.data.items : [];

  // Llave de la faceta, catálogo y parámetro de la URL de cada filtro de atributo.
  const options = (facet: string, kind: CatalogKind, param: keyof typeof params) =>
    facetOptions(catalog, kind, facets?.values[facet], params[param]);
  const groups: FilterGroup[] = [
    { title: t("catalog.filters.brand"), name: "brand", options: brandList.map((b) => ({ value: b.slug, label: b.name })) },
    { title: t("catalog.filters.gender"), name: "gender", options: options("gender", "frame_gender", "gender") },
    { title: t("catalog.filters.shape"), name: "shape", options: options("shape", "frame_shape", "shape") },
    { title: t("catalog.filters.material"), name: "frame_material", options: options("material", "frame_material", "frame_material") },
    { title: t("catalog.filters.rim"), name: "rim", options: options("rim", "frame_rim", "rim") },
    { title: t("catalog.filters.color"), name: "color", options: options("color", "frame_color", "color") },
    {
      title: t("catalog.filters.price"), name: "max_price_cents",
      options: [
        ...FRAME_PRICE_BANDS.map((band) => ({ value: String(band), label: priceBandLabel(band) })),
        // Un precio fuera de los rangos (URL compartida) conserva una etiqueta legible en su chip.
        ...(params.max_price_cents && !FRAME_PRICE_BANDS.map(String).includes(params.max_price_cents)
          ? [{ value: params.max_price_cents, label: t("catalog.upTo", { price: formatMxn(Number(params.max_price_cents)) }) }]
          : []),
      ],
    },
    {
      title: t("catalog.filters.minPrice"), name: "min_price_cents", chipOnly: true,
      options: params.min_price_cents
        ? [{ value: params.min_price_cents, label: t("catalog.from", { price: formatMxn(Number(params.min_price_cents)) }) }]
        : [],
    },
  ].filter((g) => g.chipOnly || g.options.length > 0);

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl">{t("common.frames")}</h1>
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <CatalogFilters base="/armazones" params={params} groups={groups} />
        <div>
          <ActiveFilters base="/armazones" params={params} groups={groups} />
          {failed ? (
            <p role="alert" className="text-muted-foreground">{t("frames.loadFailed")}</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">{t("frames.noResults")}</p>
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
