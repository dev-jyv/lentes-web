import type { CatalogFacets, HomeContent } from "@/lib/api/generated/model";
import { formatMxn } from "@/lib/format";
import { imageSrc } from "@/lib/images";
import { isInternalHref } from "@/lib/safe-next";
import { t } from "@/lib/i18n";

export type NavLink = { label: string; href: string; value?: string };
export type NavColumn = {
  title: string;
  facet?: string; // llave de CatalogFacets.values; filtra valores sin productos
  links: NavLink[];
};
// Tarjeta visual del megamenú (SPEC 15): la administra el admin como banner `menu_card`.
export type NavCard = { label: string; href: string; image: string; alt: string };
export type NavItem = { label: string; href: string; allLabel: string; columns: NavColumn[]; cards?: NavCard[] };

// Rangos de precio de armazones (SPEC 03), en centavos MXN.
export const FRAME_PRICE_BANDS = [99900, 149900, 249900];

const MAX_BRANDS_IN_COLUMN = 8;
// La API ya limita a 4 tarjetas por menú; el panel está diseñado para ese máximo.
const MAX_MENU_CARDS = 4;

export const priceBandLabel = (cents: number) => t("catalog.upTo", { price: formatMxn(cents).replace(/\.00$/, "") });

// Valor de una faceta que tiene al menos un producto.
const available = (facets: CatalogFacets, key: string, value: string) =>
  facets.values[key]?.some((v) => v.value === value && v.count > 0) ?? false;

// Columna de un atributo: valores con productos, con la etiqueta y el orden del catálogo (SPEC 16).
function facetColumn(title: string, facet: string, param: string, base: string, facets: CatalogFacets | null): NavColumn | null {
  const links = (facets?.values[facet] ?? [])
    .filter((v) => v.count > 0)
    .map((v) => ({ label: v.label, value: v.value, href: `${base}?${param}=${v.value}` }));
  return links.length ? { title, facet, links } : null;
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

// Parámetros de la URL del listado que corresponden a una faceta.
const FACET_PARAMS: Record<string, string> = {
  gender: "gender", shape: "shape", frame_material: "material", rim: "rim", color: "color",
  lens_type: "lens_type", replacement: "replacement",
};

type CategoryFacets = { frames: CatalogFacets | null; lenses: CatalogFacets | null };

// Una tarjeta solo aparece si su filtro lleva al menos a un producto (SPEC 15, punto 6). Si las facetas fallaron
// no se sabe: se muestra, igual que la categoría del menú.
function leadsToProducts(href: string, { frames, lenses }: CategoryFacets): boolean {
  const url = new URL(href, "http://tienda.local");
  const facets = url.pathname === "/armazones" ? frames : url.pathname === "/lentes" ? lenses : null;
  if (!facets) return true;
  return [...url.searchParams].every(([param, value]) => {
    if (param === "brand") return facets.brands.some((b) => b.slug === value && b.count > 0);
    const facet = FACET_PARAMS[param];
    return !facet || available(facets, facet, value);
  });
}

// Tarjetas de código: solo se usan si GET /v1/home falla (SPEC 15, punto 22).
const FALLBACK_CARDS: Record<"frame" | "contact_lens", NavCard[]> = {
  frame: [
    { label: t("nav.forWomen"), href: "/armazones?gender=women", image: "/menu/armazones.svg", alt: "" },
    { label: t("nav.forMen"), href: "/armazones?gender=men", image: "/menu/armazones.svg", alt: "" },
  ],
  contact_lens: [
    { label: t("nav.daily"), href: "/lentes?replacement=daily", image: "/menu/lentes.svg", alt: "" },
    { label: t("nav.monthly"), href: "/lentes?replacement=monthly", image: "/menu/lentes.svg", alt: "" },
  ],
};

// Tarjetas vigentes del admin para un menú; una sin imagen válida o con enlace externo se omite.
function cards(home: HomeContent | null, menu: "frame" | "contact_lens", facets: CategoryFacets): NavCard[] {
  const source = home
    ? home.menu_cards[menu].flatMap((b) => {
        const image = imageSrc(b.image_url);
        return image && isInternalHref(b.cta_href) ? [{ label: b.title, href: b.cta_href, image, alt: b.image_alt ?? "" }] : [];
      })
    : FALLBACK_CARDS[menu];
  return source.filter((c) => leadsToProducts(c.href, facets)).slice(0, MAX_MENU_CARDS);
}

const compact = (columns: (NavColumn | null)[]) => columns.filter((c): c is NavColumn => c !== null);

type NavData = CategoryFacets & {
  brands: { slug: string; name: string }[];
  // Contenido de GET /v1/home; null si la API falló.
  home: HomeContent | null;
};

// Arma el menú con lo que realmente está a la venta. Sin datos (API caída) quedan solo los enlaces fijos.
export function buildNavigation({ frames, lenses, brands, home }: NavData): NavItem[] {
  const items: NavItem[] = [];

  // Sin armazones activos no hay a dónde llevar. Si la API falló, no se sabe: se muestra.
  if (!frames || frames.total > 0) {
    items.push({
      label: t("common.frames"),
      href: "/armazones",
      allLabel: t("nav.allFrames"),
      columns: compact([
        facetColumn(t("catalog.filters.gender"), "gender", "gender", "/armazones", frames),
        facetColumn(t("catalog.filters.shape"), "shape", "shape", "/armazones", frames),
        facetColumn(t("catalog.filters.material"), "material", "frame_material", "/armazones", frames),
        priceColumn(frames),
        brandColumn("/armazones", frames),
      ]),
      cards: cards(home, "frame", { frames, lenses }),
    });
  }

  items.push({
    label: t("common.contactLenses"),
    href: "/lentes",
    allLabel: t("nav.allLenses"),
    columns: compact([
      facetColumn(t("nav.byUse"), "replacement", "replacement", "/lentes", lenses),
      facetColumn(t("nav.byNeed"), "lens_type", "lens_type", "/lentes", lenses),
      brandColumn("/lentes", lenses),
      {
        title: t("nav.yourPrescription"),
        links: [
          { label: t("nav.uploadPrescription"), href: "/cuenta/recetas" },
          { label: t("account.orders"), href: "/cuenta/pedidos" },
        ],
      },
    ]),
    cards: cards(home, "contact_lens", { frames, lenses }),
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
  const shapes = (frames?.values.shape ?? []).filter((v) => v.count > 0).map((v) => ({
    label: v.label,
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
