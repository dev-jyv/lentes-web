import { env } from "@/lib/env";

// Solo navegador. En servidor las llamadas autenticadas pasan el header
// Authorization explícito (el mutator no puede importar next/headers porque
// los hooks generados también se usan desde componentes cliente).
async function getBrowserToken(): Promise<string | undefined> {
  if (typeof window === "undefined" || !env.supabaseUrl) return undefined;
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token;
}

// Mutator de orval: devuelve { data, status, headers } sin lanzar en 4xx/5xx
// (los errores llegan como application/problem+json en `data`).
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = headers.has("Authorization") ? undefined : await getBrowserToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${env.apiUrl}${url}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  return { data, status: res.status, headers: res.headers } as T;
}
