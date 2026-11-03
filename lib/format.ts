const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

// El backend manda centavos; solo se formatea, nunca se calcula.
export const formatMxn = (cents: number) => mxn.format(cents / 100);

export const lensTypeLabel = {
  spherical: "Esférico",
  toric: "Tórico (astigmatismo)",
  multifocal: "Multifocal",
  cosmetic: "Cosmético",
} as const;

export const replacementLabel = {
  daily: "Diario",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
} as const;

export const shapeLabel = {
  rectangular: "Rectangular",
  square: "Cuadrado",
  round: "Redondo",
  oval: "Ovalado",
  cat_eye: "Ojo de gato",
  aviator: "Aviador",
  browline: "Browline",
  geometric: "Geométrico",
} as const;

export const frameMaterialLabel = {
  acetate: "Acetato",
  metal: "Metal",
  titanium: "Titanio",
  tr90: "TR90",
  mixed: "Mixto",
} as const;

export const rimLabel = {
  full: "Aro completo",
  semi: "Semi al aire",
  rimless: "Al aire",
} as const;

export const genderLabel = {
  women: "Mujer",
  men: "Hombre",
  unisex: "Unisex",
  kids: "Niños",
} as const;

export const colorLabel = {
  black: "Negro",
  tortoise: "Carey",
  brown: "Café",
  transparent: "Transparente",
  gray: "Gris",
  blue: "Azul",
  green: "Verde",
  red: "Rojo",
  pink: "Rosa",
  purple: "Morado",
  gold: "Dorado",
  silver: "Plateado",
  multicolor: "Multicolor",
} as const;

// Etiquetas pensadas para el cliente: dicen para qué sirve cada tipo de lente.
export const lensNeedLabel = {
  spherical: "Esféricos · miopía e hipermetropía",
  toric: "Tóricos · astigmatismo",
  multifocal: "Multifocales · presbicia",
  cosmetic: "Cosméticos",
} as const;

// Devuelve el valor solo si existe en el mapa; un valor desconocido en la URL se ignora.
export function pickKey<T extends object>(labels: T, value: string | undefined): (keyof T & string) | undefined {
  return value !== undefined && Object.hasOwn(labels, value) ? (value as keyof T & string) : undefined;
}

// Ruta canónica de un producto según su categoría.
export const productHref = (p: { category: string; slug: string }) =>
  `${p.category === "frame" ? "/armazones" : "/lentes"}/${p.slug}`;

export function formatLeadTime(days: number): string {
  return days === 1 ? "24 horas" : `${days} días`;
}
