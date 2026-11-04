import { createInstance } from "i18next";
import esMX from "@/messages/es-MX.json";

// Todos los textos fijos de la interfaz viven en messages/es-MX.json. Las mismas funciones sirven
// en Server Components y en componentes de cliente porque la inicialización es síncrona.
const i18n = createInstance();

void i18n.init({
  lng: "es-MX",
  fallbackLng: false,
  initAsync: false,
  resources: { "es-MX": { translation: esMX } },
  // React ya escapa lo que pinta; escapar aquí duplicaría entidades como &amp;.
  interpolation: { escapeValue: false, defaultVariables: { brand: esMX.brand.name } },
});

export const t = i18n.t.bind(i18n);
