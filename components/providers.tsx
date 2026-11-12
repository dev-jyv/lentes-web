"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CatalogProvider } from "@/components/catalog-provider";
import { CartDrawerProvider } from "@/components/tienda/cart-drawer";
import { Toaster } from "@/components/ui/sonner";
import type { PublicCatalogs } from "@/lib/api/generated/model";

export function Providers({ catalogs, children }: { catalogs: PublicCatalogs | null; children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <CatalogProvider data={catalogs}>
        <CartDrawerProvider>{children}</CartDrawerProvider>
      </CatalogProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
