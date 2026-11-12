"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CartDrawerProvider } from "@/components/tienda/cart-drawer";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <CartDrawerProvider>{children}</CartDrawerProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
