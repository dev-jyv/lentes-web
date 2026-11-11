// Cabeceras de seguridad de la tienda. Pura y sin imports de la app para poder usarla desde next.config.ts.
//
// CSP sin nonce, a propósito: un nonce obliga a renderizar TODAS las páginas en cada petición (sin caché estática
// ni ISR) y el catálogo público depende de ellas para rendir y posicionar. Se acepta 'unsafe-inline' en scripts
// y estilos (lo que Next inyecta) y se compensa con lo demás: sin eval en producción, sin plugins, sin <base>,
// formularios solo a nuestro origen, sin embebidos, y conexiones/imágenes/frames limitados a los orígenes que la tienda usa.
// Si se quiere CSP estricta con nonce, hay que aceptar ese costo (ver docs/SECURITY.md).

type Env = Record<string, string | undefined>;

const origin = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const uniq = (items: (string | null)[]): string[] => [...new Set(items.filter((x): x is string => !!x))];

function contentSecurityPolicy(env: Env, dev = false): string {
  const api = origin(env.NEXT_PUBLIC_API_URL);
  const supabase = origin(env.NEXT_PUBLIC_SUPABASE_URL);
  const posthog = origin(env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com");
  // El DSN de Sentry apunta a *.ingest.sentry.io (o a un host propio): se permite el origen del DSN.
  const sentry = origin(env.NEXT_PUBLIC_SENTRY_DSN?.replace(/^(https?:\/\/)[^@/]+@/, "$1"));
  const img = origin(env.NEXT_PUBLIC_IMG_URL);
  const turnstile = "https://challenges.cloudflare.com";

  const connect = uniq([
    "'self'",
    api,
    supabase,
    supabase?.replace(/^http/, "ws") ?? null,
    posthog,
    sentry,
    // Subida de recetas: PUT prefirmado directo al bucket de R2.
    "https://*.r2.cloudflarestorage.com",
    // En desarrollo, la API local y el hot reload.
    ...(dev ? ["http://localhost:*", "ws://localhost:*"] : []),
  ]);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", turnstile, ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": uniq(["'self'", "data:", "blob:", img]),
    "font-src": ["'self'", "data:"],
    "connect-src": connect,
    "frame-src": [turnstile],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    // Solo con sitio HTTPS: en una vista previa local por http, el navegador subiría a https los enlaces a sí mismo y fallarían.
    ...(!dev && env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ? { "upgrade-insecure-requests": [] } : {}),
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v].join(" "))
    .join("; ");
}

export function securityHeaders(env: Env, dev = false): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env, dev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  ];
}
