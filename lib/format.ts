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
