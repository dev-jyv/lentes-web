import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { request, type APIRequestContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

// Ayudantes que preparan y limpian datos del usuario de prueba directo en lentes-api (SPEC 20).
// La suite corre contra la API real con la cuenta real: todo lo que se borra se respalda antes.

export const E2E_PREFIX = "E2E ";
const BACKUP = "playwright/.auth/backup.json";

type CartItem = {
  id: string; variant_id: string; eye: "right" | "left" | "both"; quantity: number;
  product: { slug: string }; lens_package: { id: string } | null; lens_treatment: { slug: string } | null;
};
type Address = { id: string; recipient: string; is_default: boolean } & Record<string, unknown>;
type Customer = { full_name?: string | null; phone?: string | null; marketing_opt_in: boolean };
type Backup = { cart: CartItem[]; defaultAddressId: string | null; me: Customer };

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Define ${name} en .env o .env.local`);
  return v;
}

const apiUrl = () => need("NEXT_PUBLIC_API_URL").replace(/\/$/, "");

// Inicia sesión con la cuenta de prueba sin pasar por el formulario (y sin Turnstile).
// Con SUPABASE_SECRET_KEY usa un enlace mágico generado por la API de administración: no pide captcha, así que
// funciona con la protección CAPTCHA de Supabase activa. Sin ella, cae al login con contraseña.
// Devuelve el access token para lentes-api y las cookies de sesión de @supabase/ssr para el navegador.
export async function signInTestUser(linkType: "magiclink" | "recovery" = "magiclink") {
  const user = process.env.APP_USER;
  if (!user) throw new Error("Define APP_USER en .env");
  const url = need("NEXT_PUBLIC_SUPABASE_URL");
  const jar = new Map<string, string>();
  const supabase = createServerClient(url, need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });

  const secret = process.env.SUPABASE_SECRET_KEY;
  if (linkType === "recovery" && !secret) throw new Error("El enlace de recuperación requiere SUPABASE_SECRET_KEY en .env");
  if (secret) {
    const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: linkType, email: user }),
    });
    if (!res.ok) throw new Error(`Supabase no generó el enlace de prueba: ${res.status} ${await res.text()}`);
    const link = await res.json();
    const tokenHash = link.hashed_token ?? link.properties?.hashed_token;
    const { error } = await supabase.auth.verifyOtp({ type: linkType, token_hash: tokenHash });
    if (error) throw new Error(`Supabase rechazó el enlace de prueba: ${error.message}`);
  } else {
    const password = process.env.APP_PASSWORD;
    if (!password) throw new Error("Define SUPABASE_SECRET_KEY, o APP_PASSWORD, en .env");
    const { error } = await supabase.auth.signInWithPassword({ email: user, password });
    if (error) throw new Error(`Supabase rechazó el login de prueba: ${error.message}`);
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Supabase no devolvió sesión para la cuenta de prueba");
  return { session: data.session, accessToken: data.session.access_token, cookies: [...jar].map(([name, value]) => ({ name, value })) };
}

let ctx: { req: APIRequestContext; token: string } | null = null;

async function session() {
  if (ctx) return ctx;
  const { accessToken } = await signInTestUser();
  ctx = { req: await request.newContext(), token: accessToken };
  return ctx;
}

async function api<T = unknown>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, data?: unknown): Promise<T> {
  const { req, token } = await session();
  const res = await req.fetch(`${apiUrl()}${path}`, { method, data, headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok()) throw new Error(`${method} ${path} → ${res.status()} ${await res.text()}`);
  return (res.status() === 204 ? undefined : await res.json()) as T;
}

export const getCart = () => api<{ items: CartItem[] }>("GET", "/cart");
export const listAddresses = async () => (await api<{ items: Address[] }>("GET", "/me/addresses")).items;
export const getMe = () => api<Customer>("GET", "/me");
export const updateMe = (body: Customer) => api<Customer>("PUT", "/me", body);
export const deleteAddress = (id: string) => api("DELETE", `/me/addresses/${id}`);
export const updateAddress = (a: Address) => {
  const { id, ...rest } = a;
  return api<Address>("PUT", `/me/addresses/${id}`, rest);
};

export async function emptyCart() {
  for (const item of (await getCart()).items) await api("DELETE", `/cart/items/${item.id}`);
}

// Armazón con la necesidad "Solo armazón" (sin receta).
export async function addFrame(slug: string) {
  const p = await api<{ frame_variants: { id: string; in_stock: boolean }[]; lens_packages: { id: string; vision_type: string }[] }>("GET", `/products/${slug}`);
  const variant = p.frame_variants.find((v) => v.in_stock);
  const pkg = p.lens_packages.find((l) => l.vision_type === "frame_only");
  if (!variant || !pkg) throw new Error(`${slug} no tiene variante en existencia o "Solo armazón" activo`);
  await api("POST", "/cart/items", { variant_id: variant.id, eye: "both", quantity: 1, lens_package_id: pkg.id });
}

// Lentes de contacto: primera combinación disponible para el ojo derecho.
export async function addLens(slug: string) {
  const p = await api<{ options: { spheres: number[]; base_curves: number[]; diameters: number[] } }>("GET", `/products/${slug}`);
  const q = new URLSearchParams({
    sphere: String(p.options.spheres.find((s) => s < 0) ?? p.options.spheres[0]),
    base_curve: String(p.options.base_curves[0]),
    diameter: String(p.options.diameters[0]),
  });
  const variant = await api<{ id: string }>("GET", `/products/${slug}/variant?${q}`);
  await api("POST", "/cart/items", { variant_id: variant.id, eye: "right", quantity: 1 });
}

export async function cleanupAddresses() {
  for (const a of await listAddresses()) if (a.recipient.startsWith(E2E_PREFIX)) await deleteAddress(a.id);
  const backup = readBackup();
  if (!backup?.defaultAddressId) return;
  const original = (await listAddresses()).find((a) => a.id === backup.defaultAddressId);
  if (original && !original.is_default) await updateAddress({ ...original, is_default: true });
}

function readBackup(): Backup | null {
  return existsSync(BACKUP) ? (JSON.parse(readFileSync(BACKUP, "utf8")) as Backup) : null;
}

// Si una corrida anterior se cortó, el respaldo existente es el bueno: no se sobrescribe con un carrito ya vaciado.
export async function backupAccount() {
  if (readBackup()) return;
  const addresses = await listAddresses();
  const backup: Backup = {
    cart: (await getCart()).items,
    defaultAddressId: addresses.find((a) => a.is_default)?.id ?? null,
    me: await getMe(),
  };
  mkdirSync(dirname(BACKUP), { recursive: true });
  writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
}

export async function restoreAccount() {
  const backup = readBackup();
  if (!backup) return;
  await emptyCart();
  for (const i of backup.cart) {
    // La línea del carrito solo trae el slug del tratamiento; el id sale de la ficha del producto.
    let treatmentId: string | null = null;
    if (i.lens_treatment) {
      const p = await api<{ lens_treatments: { id: string; slug: string }[] }>("GET", `/products/${i.product.slug}`);
      treatmentId = p.lens_treatments.find((tr) => tr.slug === i.lens_treatment!.slug)?.id ?? null;
    }
    await api("POST", "/cart/items", {
      variant_id: i.variant_id, eye: i.eye, quantity: i.quantity,
      lens_package_id: i.lens_package?.id ?? null, lens_treatment_id: treatmentId,
    });
  }
  await cleanupAddresses();
  const { full_name = null, phone = null, marketing_opt_in } = backup.me;
  await updateMe({ full_name, phone, marketing_opt_in });
  rmSync(BACKUP);
}

// Carrito anónimo con un armazón "Solo armazón"; devuelve el cart_token que emite la API (SPEC 26).
export async function addFrameAnonymous(slug: string): Promise<string> {
  const req = await request.newContext();
  const p = await (await req.get(`${apiUrl()}/products/${slug}`)).json() as {
    frame_variants: { id: string; in_stock: boolean }[]; lens_packages: { id: string; vision_type: string }[];
  };
  const variant = p.frame_variants.find((v) => v.in_stock);
  const pkg = p.lens_packages.find((l) => l.vision_type === "frame_only");
  if (!variant || !pkg) throw new Error(`${slug} no tiene variante en existencia o "Solo armazón" activo`);
  const res = await req.post(`${apiUrl()}/cart/items`, { data: { variant_id: variant.id, eye: "both", quantity: 1, lens_package_id: pkg.id } });
  if (!res.ok()) throw new Error(`POST /cart/items anónimo → ${res.status()} ${await res.text()}`);
  const token = (await res.json()).cart_token as string | undefined;
  if (!token) throw new Error("La API no devolvió cart_token para el carrito anónimo");
  return token;
}

// Lentes de contacto en un carrito anónimo (requieren receta); devuelve el cart_token (SPEC 25).
export async function addLensAnonymous(slug: string): Promise<string> {
  const req = await request.newContext();
  const p = await (await req.get(`${apiUrl()}/products/${slug}`)).json() as { options: { spheres: number[]; base_curves: number[]; diameters: number[] } };
  const q = new URLSearchParams({
    sphere: String(p.options.spheres.find((s) => s < 0) ?? p.options.spheres[0]),
    base_curve: String(p.options.base_curves[0]),
    diameter: String(p.options.diameters[0]),
  });
  const variant = await (await req.get(`${apiUrl()}/products/${slug}/variant?${q}`)).json() as { id: string };
  const res = await req.post(`${apiUrl()}/cart/items`, { data: { variant_id: variant.id, eye: "right", quantity: 1 } });
  if (!res.ok()) throw new Error(`POST /cart/items anónimo → ${res.status()} ${await res.text()}`);
  return (await res.json()).cart_token as string;
}
