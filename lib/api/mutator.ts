import { env } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: { title?: string; detail?: string; type?: string },
  ) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
  }
}

async function getAccessToken(): Promise<string | undefined> {
  if (!env.supabaseUrl) return undefined;
  if (typeof window === "undefined") {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    return (await supabase.auth.getSession()).data.session?.access_token;
  }
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token;
}

// Mutator de orval: recibe URL relativa a /v1 y opciones fetch.
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = await getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${env.apiUrl}${url}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, body ?? {});
  return body as T;
}
