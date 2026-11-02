import type { Metadata } from "next";
import { ActiveFilters, CatalogFilters, toOptions, type FilterGroup } from "@/components/tienda/catalog-filters";
import { ProductCard } from "@/components/tienda/product-card";
import { listProducts } from "@/lib/api/generated/api";
import type { FrameColor, FrameGender, FrameMaterial, FrameRim, FrameShape } from "@/lib/api/generated/model";
import { colorLabel, formatMxn, frameMaterialLabel, genderLabel, pickKey, rimLabel, shapeLabel } from "@/lib/format";
import { FRAME_PRICE_BANDS, priceBandLabel } from "@/lib/navigation";
import { loadFacets } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Armazones",
  description: "Armazones de las mejores marcas: busca por forma, material, color y precio.",
};

type SearchParams = Promise<Record<string, string | undefined>>;

// Un precio en la URL debe ser un entero positivo; lo demás se ignora.
const cents = (value: string | undefined) => (value && /^\d{1,12}$/.test(value) ? value : undefined);

export default async function FramesPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const facets = await loadFacets("frame");
  const brandList = facets?.brands ?? [];

  // Solo valores conocidos: un filtro inválido en la URL se ignora.
  const params = {
    brand: brandList.some((b) => b.slug === raw.brand) ? raw.brand : undefined,
    gender: pickKey(genderLabel, raw.gender),
    shape: pickKey(shapeLabel, raw.shape),
    frame_material: pickKey(frameMaterialLabel, raw.frame_material),
    rim: pickKey(rimLabel, raw.rim),
    color: pickKey(colorLabel, raw.color),
    min_price_cents: cents(raw.min_price_cents),
    max_price_cents: cents(raw.max_price_cents),
  };

  const res = await listProducts({
    category: "frame",
    brand: params.brand,
    gender: params.gender as FrameGender | undefined,
    shape: params.shape as FrameShape | undefined,
    frame_material: params.frame_material as FrameMaterial | undefined,
    rim: params.rim as FrameRim | undefined,
    color: params.color as FrameColor | undefined,
    min_price_cents: params.min_price_cents ? Number(params.min_price_cents) : undefined,
    max_price_cents: params.max_price_cents ? Number(params.max_price_cents) : undefined,
  }).catch(() => null);
  const failed = res?.status !== 200;
  const items = res?.status === 200 ? res.data.items : [];

  const withProducts = (key: string, labels: Record<string, string>) =>
    toOptions(labels).filter((o) => facets?.values[key]?.some((v) => v.value === o.value));
  const groups: FilterGroup[] = [
    { title: "Marca", name: "brand", options: brandList.map((b) => ({ value: b.slug, label: b.name })) },
    { title: "Para quién", name: "gender", options: withProducts("gender", genderLabel) },
    { title: "Forma", name: "shape", options: withProducts("shape", shapeLabel) },
    { title: "Material", name: "frame_material", options: withProducts("material", frameMaterialLabel) },
    { title: "Aro", name: "rim", options: withProducts("rim", rimLabel) },
    { title: "Color", name: "color", options: withProducts("color", colorLabel) },
    {
      title: "Precio", name: "max_price_cents",
      options: [
        ...FRAME_PRICE_BANDS.map((band) => ({ value: String(band), label: priceBandLabel(band) })),
        // Un precio fuera de los rangos (URL compartida) conserva una etiqueta legible en su chip.
        ...(params.max_price_cents && !FRAME_PRICE_BANDS.map(String).includes(params.max_price_cents)
          ? [{ value: params.max_price_cents, label: `Hasta ${formatMxn(Number(params.max_price_cents))}` }]
          : []),
      ],
    },
    {
      title: "Precio mínimo", name: "min_price_cents", chipOnly: true,
      options: params.min_price_cents
        ? [{ value: params.min_price_cents, label: `Desde ${formatMxn(Number(params.min_price_cents))}` }]
        : [],
    },
  ].filter((g) => g.chipOnly || g.options.length > 0);

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl">Armazones</h1>
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <CatalogFilters base="/armazones" params={params} groups={groups} />
        <div>
          <ActiveFilters base="/armazones" params={params} groups={groups} />
          {failed ? (
            <p role="alert" className="text-muted-foreground">No pudimos cargar los armazones. Intenta de nuevo en unos minutos.</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">No encontramos armazones con esos filtros.</p>
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
