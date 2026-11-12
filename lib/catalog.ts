import type { CatalogEntry, CatalogFacetsValuesItem, PublicCatalogs } from "@/lib/api/generated/model";
import { t } from "@/lib/i18n";

// Catálogos de atributos administrables (SPEC 16). Las etiquetas, el orden y las muestras de color salen de
// GET /v1/catalogs; messages/es-MX.json (labels.*) solo es el respaldo si la API falla.
export type CatalogKind = keyof PublicCatalogs;

const FALLBACK: Record<CatalogKind, Record<string, string>> = {
  lens_type: t("labels.lensType", { returnObjects: true }),
  replacement: t("labels.replacement", { returnObjects: true }),
  frame_shape: t("labels.shape", { returnObjects: true }),
  frame_material: t("labels.frameMaterial", { returnObjects: true }),
  frame_rim: t("labels.rim", { returnObjects: true }),
  frame_gender: t("labels.gender", { returnObjects: true }),
  frame_color: t("labels.color", { returnObjects: true }),
  frame_size: t("labels.frameSize", { returnObjects: true }),
  frame_include: t("labels.frameInclude", { returnObjects: true }),
};

// Mismo patrón que la API para los códigos de catálogo: lo demás en la URL se ignora.
const CODE = /^[a-z][a-z0-9_]{1,39}$/;
export const catalogCode = (value: string | undefined) => (value && CODE.test(value) ? value : undefined);

// Un código sin etiqueta conocida se muestra legible ("cat_eye" → "Cat eye"), nunca vacío.
const humanize = (code: string) => {
  const text = code.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export type Catalog = ReturnType<typeof makeCatalog>;

// `data` es la respuesta de GET /v1/catalogs, o null si la API falló.
export function makeCatalog(data: PublicCatalogs | null) {
  const find = (kind: CatalogKind, code: string) => data?.[kind]?.find((e) => e.code === code);
  return {
    // Valores visibles, en el orden del catálogo.
    entries(kind: CatalogKind): CatalogEntry[] {
      return data?.[kind] ?? Object.entries(FALLBACK[kind]).map(([code, label]) => ({ code, label }));
    },
    // Un valor oculto no viene en la API: su ficha sigue mostrando la etiqueta de respaldo o el código legible.
    label(kind: CatalogKind, code: string): string {
      return find(kind, code)?.label ?? (Object.hasOwn(FALLBACK[kind], code) ? FALLBACK[kind][code] : humanize(code));
    },
    // Si el valor está visible en el catálogo. Sin API no se sabe qué está oculto: cuenta lo conocido.
    visible(kind: CatalogKind, code: string): boolean {
      return data ? !!find(kind, code) : Object.hasOwn(FALLBACK[kind], code);
    },
    swatch(code: string): string | undefined {
      return find("frame_color", code)?.swatch;
    },
  };
}

export type FilterOption = { value: string; label: string; chipOnly?: boolean };

// Opciones de un filtro del listado (SPEC 16, punto 17): valores con productos en toda la categoría, sin cruzar con
// los demás filtros, en el orden del catálogo. El valor seleccionado se agrega si falta; si está oculto, solo
// aporta la etiqueta de su chip y no aparece marcado en la lista.
export function facetOptions(
  catalog: Catalog,
  kind: CatalogKind,
  values: CatalogFacetsValuesItem[] | undefined,
  selected: string | undefined,
): FilterOption[] {
  const options: FilterOption[] = (values ?? []).filter((v) => v.count > 0).map((v) => ({ value: v.value, label: v.label }));
  if (!selected || options.some((o) => o.value === selected)) return options;
  const option = { value: selected, label: catalog.label(kind, selected) };
  if (!catalog.visible(kind, selected)) return [...options, { ...option, chipOnly: true }];
  const order = catalog.entries(kind).map((e) => e.code);
  const at = options.findIndex((o) => order.indexOf(o.value) > order.indexOf(selected));
  return at === -1 ? [...options, option] : [...options.slice(0, at), option, ...options.slice(at)];
}
