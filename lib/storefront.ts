import { getCatalogFacets, getCatalogs, getHome } from "@/lib/api/generated/api";
import type { CatalogFacets, HomeContent, ProductCategory, PublicCatalogs } from "@/lib/api/generated/model";
import { makeCatalog } from "@/lib/catalog";

// El header está en todas las páginas: sus datos se cachean para no consultar la API en cada render.
const FACETS_REVALIDATE_SECONDS = 300;
const HOME_REVALIDATE_SECONDS = 60;
// Etiquetas de atributos (SPEC 16): la API las cachea 300 s.
const CATALOGS_REVALIDATE_SECONDS = 300;

// Una falla de la API nunca rompe la página: devuelve null y cada sección decide qué mostrar.
export async function loadFacets(category: ProductCategory): Promise<CatalogFacets | null> {
  try {
    const res = await getCatalogFacets({ category }, { next: { revalidate: FACETS_REVALIDATE_SECONDS } });
    return res.status === 200 ? res.data : null;
  } catch {
    return null;
  }
}

export async function loadHome(): Promise<HomeContent | null> {
  try {
    const res = await getHome({ next: { revalidate: HOME_REVALIDATE_SECONDS } });
    return res.status === 200 ? res.data : null;
  } catch {
    return null;
  }
}

export async function loadCatalogs(): Promise<PublicCatalogs | null> {
  try {
    // Con los ocultos, para mostrar la etiqueta de un producto que aún los usa (SPEC 18).
    const res = await getCatalogs({ include_hidden: true }, { next: { revalidate: CATALOGS_REVALIDATE_SECONDS } });
    return res.status === 200 ? res.data : null;
  } catch {
    return null;
  }
}

// Etiquetas y orden de los catálogos para Server Components; sin API usa labels.* de messages/es-MX.json.
export async function loadCatalog() {
  return makeCatalog(await loadCatalogs());
}
