import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { addFavorite, getListFavoritesQueryKey, listFavorites, listProducts, mergeFavorites, removeFavorite } from "@/lib/api/generated/api";
import type { Favorite, Product } from "@/lib/api/generated/model";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";

export type LocalFavorite = { product_id: string; added_at: string };

const KEY = "favorites";
const MAX_LOCAL = 50;
const EMPTY: LocalFavorite[] = [];
const NO_PENDING = new Map<string, boolean>();

// Estado compartido por todos los corazones de la página.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((cb) => cb());
// undefined: la sesión aún no se conoce.
let userId: string | null | undefined = env.supabaseUrl ? undefined : null;
// Cambios con sesión que esperan respuesta de la API (true: agregar, false: quitar).
let pending = NO_PENDING;
let notice: string | null = null;
// Sin localStorage (modo privado) los favoritos viven solo en memoria de la pestaña.
let memory: LocalFavorite[] = EMPTY;
let cachedRaw: string | null = null;
let cached: LocalFavorite[] = EMPTY;
let started = false;

function parse(raw: string | null): LocalFavorite[] {
  try {
    const list: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(list)) return EMPTY;
    return list.filter((f): f is LocalFavorite => typeof f?.product_id === "string" && typeof f?.added_at === "string");
  } catch {
    return EMPTY;
  }
}

export function readLocalFavorites(): LocalFavorite[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cachedRaw) [cachedRaw, cached] = [raw, parse(raw)];
    return cached;
  } catch {
    return memory;
  }
}

// Guarda del más reciente al más antiguo; al pasar de 50 se descartan los más viejos.
export function writeLocalFavorites(list: LocalFavorite[]) {
  memory = [...list].sort((a, b) => b.added_at.localeCompare(a.added_at)).slice(0, MAX_LOCAL);
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Sin almacenamiento: queda en memoria.
  }
  emit();
}

function notify(message: string) {
  notice = message;
  emit();
}

export function dismissFavoritesNotice() {
  notice = null;
  emit();
}

function setPending(id: string, on: boolean | null) {
  pending = new Map(pending);
  if (on === null) pending.delete(id);
  else pending.set(id, on);
  emit();
}

let merging: Promise<void> | null = null;

// Sube los favoritos locales a la cuenta; solo se borran del navegador si la API responde 200.
export function mergeLocalFavorites() {
  merging ??= (async () => {
    const local = readLocalFavorites();
    if (!local.length) return;
    const res = await mergeFavorites({ items: local.map((f) => ({ product_id: f.product_id })) });
    if (res.status === 200) writeLocalFavorites([]);
    else if (res.status === 409) notify(res.data.detail ?? t("favorites.saveFailed"));
  })()
    .catch(() => {})
    .finally(() => (merging = null));
  return merging;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("storage", (e) => e.key === KEY && emit());
  if (!env.supabaseUrl) return;
  import("@/lib/supabase/client").then(({ createClient }) =>
    createClient().auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (id === userId) return;
      if (!id) {
        userId = null;
        return emit();
      }
      // Fuera del callback de Supabase (evita su bloqueo) y antes de leer la lista de la API.
      setTimeout(() => mergeLocalFavorites().then(() => {
        userId = id;
        emit();
      }));
    }),
  );
}

const subscribe = (cb: () => void) => {
  start();
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useFavoritesNotice() {
  return useSyncExternalStore(subscribe, () => notice, () => null);
}

// shortcut: la API no filtra productos por id, así que se recorre el catálogo (hasta 2,000);
// agregar un filtro `ids` a listProducts si el catálogo crece.
async function loadCatalog(): Promise<{ products: Record<string, Product>; complete: boolean }> {
  const products: Record<string, Product> = {};
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const res = await listProducts({ limit: 100, cursor });
    if (res.status !== 200) throw new Error(String(res.status));
    res.data.items.forEach((p) => (products[p.id] = p));
    cursor = res.data.next_cursor ?? undefined;
    if (!cursor) return { products, complete: true };
  }
  return { products, complete: false };
}

// Favoritos del navegador sin sesión, de la API con sesión. `withProducts` resuelve los
// productos de los favoritos locales (para el popover).
export function useFavorites({ withProducts = false } = {}) {
  const qc = useQueryClient();
  const user = useSyncExternalStore(subscribe, () => userId, () => undefined);
  const local = useSyncExternalStore(subscribe, readLocalFavorites, () => EMPTY);
  const pend = useSyncExternalStore(subscribe, () => pending, () => NO_PENDING);

  const key = [...getListFavoritesQueryKey(), user];
  const remote = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const res = await listFavorites();
      if (res.status !== 200) throw new Error(String(res.status));
      return res.data.items;
    },
  });
  const catalog = useQuery({ queryKey: ["favorites-catalog"], queryFn: loadCatalog, enabled: user === null && withProducts && local.length > 0 });

  // Sin sesión se descartan los productos que ya no están en el catálogo.
  useEffect(() => {
    if (!catalog.data?.complete) return;
    const fetchedAt = new Date(catalog.dataUpdatedAt).toISOString();
    const kept = local.filter((f) => catalog.data.products[f.product_id] || f.added_at > fetchedAt);
    if (kept.length < local.length) writeLocalFavorites(kept);
  }, [catalog.data, catalog.dataUpdatedAt, local]);

  const items: Favorite[] | undefined = user
    ? remote.data?.filter((f) => pend.get(f.product.id) !== false)
    : catalog.data && local.flatMap((f) => {
        const product = catalog.data.products[f.product_id];
        return product ? [{ product, added_at: f.added_at }] : [];
      });
  const base = user ? (remote.data ?? []).map((f) => f.product.id) : local.map((f) => f.product_id);
  const added = [...pend].filter(([id, on]) => on && !base.includes(id)).map(([id]) => id);
  const ids = [...added, ...base.filter((id) => pend.get(id) !== false)];

  const toggle = (id: string) => {
    const on = !ids.includes(id);
    track(on ? "favorite_added" : "favorite_removed", { product_id: id });
    if (!user) {
      const rest = local.filter((f) => f.product_id !== id);
      return writeLocalFavorites(on ? [{ product_id: id, added_at: new Date().toISOString() }, ...rest] : rest);
    }
    // UI optimista: si la API falla se revierte y se avisa. Las operaciones son idempotentes.
    setPending(id, on);
    const update = (fn: (old: Favorite[]) => Favorite[]) => qc.setQueryData<Favorite[]>(key, (old) => old && fn(old));
    const run = async () => {
      if (on) {
        const res = await addFavorite(id);
        if (res.status !== 200) return notify(res.data?.detail ?? t("favorites.saveFailed"));
        update((old) => [res.data, ...old.filter((f) => f.product.id !== id)]);
      } else {
        const res = await removeFavorite(id);
        if (res.status !== 204 && res.status !== 404) return notify(t("favorites.saveFailed"));
        update((old) => old.filter((f) => f.product.id !== id));
      }
    };
    run()
      .catch(() => notify(t("favorites.saveFailed")))
      // Un clic posterior sobre el mismo producto deja su propio cambio pendiente.
      .finally(() => pending.get(id) === on && setPending(id, null));
  };

  return {
    ready: user !== undefined,
    loggedIn: !!user,
    ids,
    count: ids.length,
    items,
    loading: user ? remote.isPending : withProducts && local.length > 0 && catalog.isPending,
    failed: user ? remote.isError : catalog.isError,
    toggle,
  };
}
