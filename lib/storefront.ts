import { getCatalogFacets, getHome } from "@/lib/api/generated/api";
import type { CatalogFacets, HomeContent, ProductCategory } from "@/lib/api/generated/model";

// El header está en todas las páginas: sus datos se cachean para no consultar la API en cada render.
const FACETS_REVALIDATE_SECONDS = 300;
const HOME_REVALIDATE_SECONDS = 60;

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
