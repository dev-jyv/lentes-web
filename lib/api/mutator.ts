import { getCartToken, setCartToken } from "@/lib/cart-token";
import { env } from "@/lib/env";

// Solo navegador. En servidor las llamadas autenticadas pasan el header
// Authorization explícito (el mutator no puede importar next/headers porque
// los hooks generados también se usan desde componentes cliente).
async function getBrowserToken(): Promise<string | undefined> {
  if (typeof window === "undefined" || !env.supabaseUrl) return undefined;
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token;
}

// Las rutas generadas son /v1/...; NEXT_PUBLIC_API_URL ya incluye /v1 (como en el SPEC).
const toUrl = (path: string) => `${env.apiUrl}${path.replace(/^\/v1/, "")}`;

// Mutator de orval: devuelve { data, status, headers } sin lanzar en 4xx/5xx
// (los errores llegan como application/problem+json en `data`).
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = headers.has("Authorization") ? undefined : await getBrowserToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const cartToken = getCartToken();
  if (cartToken) headers.set("X-Cart-Token", cartToken);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(toUrl(url), { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  // La API devuelve el token del carrito anónimo en el cuerpo (`cart_token`) solo al crearlo.
  if (typeof window !== "undefined" && typeof data?.cart_token === "string") {
    setCartToken(data.cart_token);
  }
  return { data, status: res.status, headers: res.headers } as T;
}
