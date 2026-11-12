"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import type { PublicCatalogs } from "@/lib/api/generated/model";
import { makeCatalog, type Catalog, type CatalogKind } from "@/lib/catalog";

// Catálogos de atributos (SPEC 16) para componentes de cliente. El layout raíz los carga una vez en servidor.
const CatalogContext = createContext<Catalog>(makeCatalog(null));

export function CatalogProvider({ data, children }: { data: PublicCatalogs | null; children: ReactNode }) {
  const catalog = useMemo(() => makeCatalog(data), [data]);
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export const useCatalog = () => use(CatalogContext);

// Etiqueta de un valor de catálogo; sirve también dentro de Server Components.
export function CatalogLabel({ kind, code }: { kind: CatalogKind; code: string }) {
  return useCatalog().label(kind, code);
}
