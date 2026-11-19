"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CatalogProvider } from "@/components/catalog-provider";
import { CartDrawerProvider } from "@/components/tienda/cart-drawer";
import { Toaster } from "@/components/ui/sonner";
import { getGetCartQueryKey, mergeCart } from "@/lib/api/generated/api";
import type { PublicCatalogs } from "@/lib/api/generated/model";
import { clearCartToken, getCartToken } from "@/lib/cart-token";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

let merging = false;

// Une el carrito anónimo al de la cuenta en cualquier inicio de sesión (correo o Google, SPEC 26).
// Si falla, el token se conserva y se reintenta en el siguiente inicio de sesión.
async function mergeAnonymousCart(client: QueryClient) {
  if (merging || !getCartToken()) return;
  merging = true;
  try {
    if ((await mergeCart()).status === 200) clearCartToken();
    await client.invalidateQueries({ queryKey: getGetCartQueryKey() });
  } catch {
    // Falla de red: el carrito anónimo sigue intacto.
  } finally {
    merging = false;
  }
}

export function Providers({ catalogs, children }: { catalogs: PublicCatalogs | null; children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  useEffect(() => {
    if (!env.supabaseUrl) return;
    const { data } = createClient().auth.onAuthStateChange((event) => {
      // Diferido: llamar a Supabase dentro del callback puede bloquear su candado de sesión.
      if (event === "SIGNED_IN") setTimeout(() => mergeAnonymousCart(client), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);
  return (
    <QueryClientProvider client={client}>
      <CatalogProvider data={catalogs}>
        <CartDrawerProvider>{children}</CartDrawerProvider>
      </CatalogProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
