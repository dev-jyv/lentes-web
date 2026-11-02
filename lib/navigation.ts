import type { CatalogFacets } from "@/lib/api/generated/model";
import { formatMxn, genderLabel, frameMaterialLabel, lensNeedLabel, replacementLabel, shapeLabel } from "@/lib/format";

export type NavLink = { label: string; href: string; value?: string };
export type NavColumn = {
  title: string;
  facet?: string; // llave de CatalogFacets.values; filtra valores sin productos
  links: NavLink[];
};
export type NavItem = { label: string; href: string; allLabel: string; columns: NavColumn[] };

// Rangos de precio de armazones (SPEC 03), en centavos MXN.
export const FRAME_PRICE_BANDS = [99900, 149900, 249900];

const MAX_BRANDS_IN_COLUMN = 8;

const fromLabels = (labels: Record<string, string>, param: string, base: string): NavLink[] =>
  Object.entries(labels).map(([value, label]) => ({ label, value, href: `${base}?${param}=${value}` }));

export const priceBandLabel = (cents: number) => `Hasta ${formatMxn(cents).replace(/\.00$/, "")}`;

// Valor de una faceta que tiene al menos un producto.
const available = (facets: CatalogFacets, key: string, value: string) =>
  facets.values[key]?.some((v) => v.value === value && v.count > 0) ?? false;

function facetColumn(title: string, facet: string, links: NavLink[], facets: CatalogFacets | null): NavColumn | null {
  if (!facets) return null;
  const present = links.filter((l) => l.value && available(facets, facet, l.value));
  return present.length ? { title, facet, links: present } : null;
}

function brandColumn(base: string, facets: CatalogFacets | null): NavColumn | null {
  if (!facets?.brands.length) return null;
  const links: NavLink[] = facets.brands
    .slice(0, MAX_BRANDS_IN_COLUMN)
    .map((b) => ({ label: b.name, href: `${base}?brand=${b.slug}` }));
  if (facets.brands.length > MAX_BRANDS_IN_COLUMN) links.push({ label: "Ver todas", href: "/marcas" });
  return { title: "Marcas", links };
}

function priceColumn(facets: CatalogFacets | null): NavColumn | null {
  const min = facets?.min_price_cents;
  if (min == null) return null;
  // Un rango solo aparece si lleva al menos a un producto con existencia.
  const links = FRAME_PRICE_BANDS.filter((band) => band >= min).map((band) => ({
    label: priceBandLabel(band),
    href: `/armazones?max_price_cents=${band}`,
  }));
  return links.length ? { title: "Precio", links } : null;
}

const compact = (columns: (NavColumn | null)[]) => columns.filter((c): c is NavColumn => c !== null);

export type NavData = {
  frames: CatalogFacets | null;
  lenses: CatalogFacets | null;
  brands: { slug: string; name: string }[];
};

// Arma el menú con lo que realmente está a la venta. Sin datos (API caída) quedan solo los enlaces fijos.
export function buildNavigation({ frames, lenses, brands }: NavData): NavItem[] {
  const items: NavItem[] = [];

  // Sin armazones activos no hay a dónde llevar. Si la API falló, no se sabe: se muestra.
  if (!frames || frames.total > 0) {
    items.push({
      label: "Armazones",
      href: "/armazones",
      allLabel: "Ver todos los armazones",
      columns: compact([
        facetColumn("Para quién", "gender", fromLabels(genderLabel, "gender", "/armazones"), frames),
        facetColumn("Forma", "shape", fromLabels(shapeLabel, "shape", "/armazones"), frames),
        facetColumn("Material", "material", fromLabels(frameMaterialLabel, "frame_material", "/armazones"), frames),
        priceColumn(frames),
        brandColumn("/armazones", frames),
      ]),
    });
  }

  items.push({
    label: "Lentes de contacto",
    href: "/lentes",
    allLabel: "Ver todos los lentes de contacto",
    columns: compact([
      facetColumn("Por uso", "replacement", fromLabels(replacementLabel, "replacement", "/lentes"), lenses),
      facetColumn("Por necesidad", "lens_type", fromLabels(lensNeedLabel, "lens_type", "/lentes"), lenses),
      brandColumn("/lentes", lenses),
      {
        title: "Tu receta",
        links: [
          { label: "Subir mi receta", href: "/cuenta/recetas" },
          { label: "Mis pedidos", href: "/cuenta/pedidos" },
        ],
      },
    ]),
  });

  items.push({
    label: "Marcas",
    href: "/marcas",
    allLabel: "Ver todas las marcas",
    columns: brands.length
      ? [{ title: "Todas las marcas", links: brands.map((b) => ({ label: b.name, href: `/marcas/${b.slug}` })) }]
      : [],
  });

  return items;
}

// Marcas con productos activos en cualquier categoría, sin repetir y en orden alfabético.
export function mergeBrands(...facets: (CatalogFacets | null)[]) {
  const bySlug = new Map<string, string>();
  for (const f of facets) for (const b of f?.brands ?? []) bySlug.set(b.slug, b.name);
  return [...bySlug].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "es"));
}
