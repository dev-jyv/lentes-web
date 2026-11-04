import { t } from "@/lib/i18n";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

// El backend manda centavos; solo se formatea, nunca se calcula.
export const formatMxn = (cents: number) => mxn.format(cents / 100);

export const lensTypeLabel = t("labels.lensType", { returnObjects: true });

export const replacementLabel = t("labels.replacement", { returnObjects: true });

export const shapeLabel = t("labels.shape", { returnObjects: true });

export const frameMaterialLabel = t("labels.frameMaterial", { returnObjects: true });

export const rimLabel = t("labels.rim", { returnObjects: true });

export const genderLabel = t("labels.gender", { returnObjects: true });

export const colorLabel = t("labels.color", { returnObjects: true });

// Etiquetas pensadas para el cliente: dicen para qué sirve cada tipo de lente.
export const lensNeedLabel = t("labels.lensNeed", { returnObjects: true });

// Devuelve el valor solo si existe en el mapa; un valor desconocido en la URL se ignora.
export function pickKey<T extends object>(labels: T, value: string | undefined): (keyof T & string) | undefined {
  return value !== undefined && Object.hasOwn(labels, value) ? (value as keyof T & string) : undefined;
}

// Ruta canónica de un producto según su categoría.
export const productHref = (p: { category: string; slug: string }) =>
  `${p.category === "frame" ? "/armazones" : "/lentes"}/${p.slug}`;

export function formatLeadTime(days: number): string {
  return days === 1 ? t("format.leadTime24h") : t("format.leadTimeDays", { days });
}
