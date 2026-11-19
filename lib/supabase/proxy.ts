import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isInternalHref } from "@/lib/safe-next";

// /checkout es público: sin sesión se compra como invitado (SPEC 25). El resultado del pago sí es de la cuenta.
const PROTECTED = ["/cuenta", "/checkout/resultado", "/recompra"];
// Con sesión, login y registro no tienen nada que hacer: se va al destino o a la cuenta. /recuperar queda abierto
// porque el enlace de cambio de contraseña llega con sesión.
const GUEST_ONLY = ["/login", "/registro"];

// Refresca la sesión en cada request y protege rutas privadas.
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  };

  if (!env.supabaseUrl) return isProtected ? redirectToLogin() : NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && isProtected) return redirectToLogin();
  if (user && GUEST_ONLY.includes(pathname)) {
    const next = request.nextUrl.searchParams.get("next");
    const target = isInternalHref(next) && !GUEST_ONLY.includes(new URL(next, request.url).pathname) ? next : "/cuenta";
    const url = new URL(target, request.url);
    const redirect = NextResponse.redirect(url);
    // Conserva las cookies de la sesión recién refrescada.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}
