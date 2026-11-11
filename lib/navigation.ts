import type { CatalogFacets } from "@/lib/api/generated/model";
import { formatMxn, genderLabel, frameMaterialLabel, lensNeedLabel, replacementLabel, shapeLabel } from "@/lib/format";
import { t } from "@/lib/i18n";

export type NavLink = { label: string; href: string; value?: string };
export type NavColumn = {
  title: string;
  facet?: string; // llave de CatalogFacets.values; filtra valores sin productos
  links: NavLink[];
};
// Tarjeta visual del megamenú. Las imágenes de public/menu son genéricas: se reemplazan por fotos propias.
export type NavCard = { label: string; href: string; image: string };
export type NavItem = { label: string; href: string; allLabel: string; columns: NavColumn[]; cards?: NavCard[] };

// Rangos de precio de armazones (SPEC 03), en centavos MXN.
export const FRAME_PRICE_BANDS = [99900, 149900, 249900];

const MAX_BRANDS_IN_COLUMN = 8;

const fromLabels = (labels: Record<string, string>, param: string, base: string): NavLink[] =>
  Object.entries(labels).map(([value, label]) => ({ label, value, href: `${base}?${param}=${value}` }));

export const priceBandLabel = (cents: number) => t("catalog.upTo", { price: formatMxn(cents).replace(/\.00$/, "") });

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
  if (facets.brands.length > MAX_BRANDS_IN_COLUMN) links.push({ label: t("home.viewAllBrands"), href: "/marcas" });
  return { title: t("brands.title"), links };
}

function priceColumn(facets: CatalogFacets | null): NavColumn | null {
  const min = facets?.min_price_cents;
  if (min == null) return null;
  // Un rango solo aparece si lleva al menos a un producto con existencia.
  const links = FRAME_PRICE_BANDS.filter((band) => band >= min).map((band) => ({
    label: priceBandLabel(band),
    href: `/armazones?max_price_cents=${band}`,
  }));
  return links.length ? { title: t("catalog.filters.price"), links } : null;
}

// Una tarjeta solo aparece si su filtro lleva al menos a un producto.
function cards(facets: CatalogFacets | null, facet: string, options: (NavCard & { value: string })[]): NavCard[] {
  if (!facets) return [];
  return options.filter((o) => available(facets, facet, o.value)).map(({ label, href, image }) => ({ label, href, image }));
}

const compact = (columns: (NavColumn | null)[]) => columns.filter((c): c is NavColumn => c !== null);

type NavData = {
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
      label: t("common.frames"),
      href: "/armazones",
      allLabel: t("nav.allFrames"),
      columns: compact([
        facetColumn(t("catalog.filters.gender"), "gender", fromLabels(genderLabel, "gender", "/armazones"), frames),
        facetColumn(t("catalog.filters.shape"), "shape", fromLabels(shapeLabel, "shape", "/armazones"), frames),
        facetColumn(t("catalog.filters.material"), "material", fromLabels(frameMaterialLabel, "frame_material", "/armazones"), frames),
        priceColumn(frames),
        brandColumn("/armazones", frames),
      ]),
      cards: cards(frames, "gender", [
        { value: "women", label: t("nav.forWomen"), href: "/armazones?gender=women", image: "/menu/armazones.svg" },
        { value: "men", label: t("nav.forMen"), href: "/armazones?gender=men", image: "/menu/armazones.svg" },
      ]),
    });
  }

  items.push({
    label: t("common.contactLenses"),
    href: "/lentes",
    allLabel: t("nav.allLenses"),
    columns: compact([
      facetColumn(t("nav.byUse"), "replacement", fromLabels(replacementLabel, "replacement", "/lentes"), lenses),
      facetColumn(t("nav.byNeed"), "lens_type", fromLabels(lensNeedLabel, "lens_type", "/lentes"), lenses),
      brandColumn("/lentes", lenses),
      {
        title: t("nav.yourPrescription"),
        links: [
          { label: t("nav.uploadPrescription"), href: "/cuenta/recetas" },
          { label: t("account.orders"), href: "/cuenta/pedidos" },
        ],
      },
    ]),
    cards: cards(lenses, "replacement", [
      { value: "daily", label: t("nav.daily"), href: "/lentes?replacement=daily", image: "/menu/lentes.svg" },
      { value: "monthly", label: t("nav.monthly"), href: "/lentes?replacement=monthly", image: "/menu/lentes.svg" },
    ]),
  });

  items.push({
    label: t("brands.title"),
    href: "/marcas",
    allLabel: t("nav.allBrands"),
    columns: brands.length
      ? [{ title: t("nav.allBrandsTitle"), links: brands.map((b) => ({ label: b.name, href: `/marcas/${b.slug}` })) }]
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

const MAX_SEARCH_CHIPS = 6;

// Búsquedas sugeridas (SPEC 07): formas y marcas con más productos, enlazadas al catálogo filtrado.
export function searchChips(frames: CatalogFacets | null, lenses: CatalogFacets | null): NavLink[] {
  const shapes = (frames?.values.shape ?? []).filter((v) => v.count > 0 && v.value in shapeLabel).map((v) => ({
    label: shapeLabel[v.value as keyof typeof shapeLabel],
    href: `/armazones?shape=${v.value}`,
    count: v.count,
  }));
  const brands = [
    ...(frames?.brands ?? []).map((b) => ({ label: b.name, href: `/armazones?brand=${b.slug}`, count: b.count })),
    ...(lenses?.brands ?? []).map((b) => ({ label: b.name, href: `/lentes?brand=${b.slug}`, count: b.count })),
  ].filter((b) => b.count > 0);
  // Una marca con armazones y lentes de contacto aparece una vez, en la categoría con más productos.
  const chips = new Map<string, NavLink>();
  for (const { label, href } of [...shapes, ...brands].sort((a, b) => b.count - a.count)) {
    if (!chips.has(label)) chips.set(label, { label, href });
  }
  return [...chips.values()].slice(0, MAX_SEARCH_CHIPS);
}
