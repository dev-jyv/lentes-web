# SPEC 26 — Acceso y registro con Google

> **Status:** Implemented — lentes-web 0dd7e2f
> **Depends on:** SPEC 08, SPEC 10
> **Date:** 2026-11-18
> **Objective:** Dejar funcionando en producción "Continuar con Google" para entrar y para crear cuenta, con el carrito anónimo y el consentimiento legal igual que en el acceso con correo.

## Context

El botón ya existe: `GoogleButton` en `components/auth/auth-forms.tsx` llama a `supabase.auth.signInWithOAuth({ provider: "google" })` desde el popover del header, `/login` y `/registro`, y `app/auth/callback/route.ts` canjea el `code` por la sesión. Hoy, al pulsarlo, Supabase responde `400 Unsupported provider: provider is not enabled` y la tienda muestra "No se pudo iniciar con Google".

Revisión del 2026-11-18 de lo que falta:

| # | Falta | Dónde | Tipo |
|---|---|---|---|
| 1 | Cliente OAuth de Google (Client ID y secreto) y pantalla de consentimiento publicada | Google Cloud Console | Configuración |
| 2 | Proveedor Google activado con ese Client ID y secreto | Supabase → Authentication → Providers | Configuración |
| 3 | URLs de regreso permitidas: producción y `http://localhost:3000/auth/callback` | Supabase → Authentication → URL Configuration | Configuración |
| 4 | **El carrito anónimo no se une al entrar con Google.** `mergeCart()` solo se llama tras `signInWithPassword` en `LoginForm`; el regreso por `/auth/callback` no lo hace. Los favoritos sí se unen, porque `lib/favorites.ts` escucha `onAuthStateChange` | Código de la tienda | Bug |
| 5 | **Registro sin aviso legal.** Quien crea cuenta con Google no ve "Al crear tu cuenta aceptas los Términos y el Aviso de privacidad" ni la casilla de promociones | Código de la tienda | Cumplimiento |
| 6 | La cuenta creada con Google no trae teléfono. `lentes-api` lo acepta vacío (`auth.go` lee `full_name`, `phone` y `marketing_opt_in` de `user_metadata`), así que no bloquea | Ninguno | Verificado, sin cambio |
| 7 | La pantalla de Google dice "continuar a `<proyecto>.supabase.co`" en vez del nombre de la tienda, salvo que se use un dominio propio en Supabase | Supabase (complemento de pago) | Decisión |
| 8 | No hay prueba E2E del regreso desde Google | `tests/` | Pruebas |

No hace falta cambiar la CSP: el viaje a Google es una navegación de página completa, no un `fetch` ni un `form`, así que `connect-src` y `form-action` no aplican.

### Verificación del 2026-11-18, tras activar el proveedor

Se comparó la implementación con la guía oficial "Login with Google" de Supabase (flujo de redirección para Next.js) y se probó contra el proyecto real:

| Punto de la guía | Estado | Evidencia |
|---|---|---|
| Proveedor Google activo en Supabase | Hecho | `GET /auth/v1/settings` devuelve `external.google: true` |
| Cliente OAuth "Aplicación web" con el URI `https://<proyecto>.supabase.co/auth/v1/callback` | Hecho | `/auth/v1/authorize?provider=google` lleva a `accounts.google.com` con ese `redirect_uri`, y Google abre su pantalla de acceso sin `redirect_uri_mismatch` ni `invalid_client` |
| Alcances `email` y `profile` | Hecho | Supabase los pide en el `authorize`. `openid` se agrega en Google (Data Access) según la guía; no afecta el flujo de redirección |
| PKCE: `signInWithOAuth` + `exchangeCodeForSession` en `/auth/callback` | Hecho | La guía lo inicia desde una server action; aquí se inicia con el cliente de navegador de `@supabase/ssr`, que también guarda el verificador PKCE en cookie. Equivalente; sin cambio |
| `next` solo relativo | Hecho, más estricto | `safeNext` además rechaza `//` y destinos externos |
| `x-forwarded-host` en el callback | No aplica | En Cloudflare Workers `request.nextUrl.origin` ya es el host público; no hay balanceador intermedio |
| Página de error del callback | Hecho, distinta ruta | La guía usa `/auth/auth-code-error`; aquí se usa `/login?error=callback` con su aviso |
| `access_type: offline` / `prompt: consent` | No aplica | Solo para usar APIs de Google después; la tienda no las usa |
| Nonce | No aplica | Solo para One Tap e ID token |
| Lista de redirecciones de Supabase | **Sin verificar** | No se puede consultar sin acceso al panel. Ver requisito 3 |
| Pantalla de consentimiento publicada y con marca | **Sin verificar** | Depende de Google Cloud. Ver requisito 1 |
| Acceso real de punta a punta con una cuenta de Google | **Pendiente** | Requiere una persona que inicie sesión con su cuenta de Google |

## Goals

- "Continuar con Google" inicia sesión o crea la cuenta en producción y en local.
- Al volver de Google, el carrito anónimo se une al de la cuenta igual que con correo y contraseña.
- Quien crea su cuenta con Google ve el aviso legal antes de salir hacia Google.
- Hay una guía paso a paso, en `docs/`, para configurar Google Cloud y Supabase en cada entorno.

## Non-goals

- Otros proveedores (Apple, Facebook).
- Google One Tap o el botón incrustado de Google Identity Services.
- Pedir el teléfono después del primer acceso con Google.
- Dominio propio para Supabase Auth (`auth.<dominio>`), para que Google muestre la marca en vez de `supabase.co`. Queda pendiente por decisión del responsable hasta tener dominio de producción.

## Dependencies

- SPEC 08 y SPEC 10: popover de login y página con pestañas, donde vive el botón.
- Acceso de administrador al proyecto de Supabase y a una cuenta de Google Cloud de la empresa.
- URLs públicas de Términos (`/terminos`) y Aviso de privacidad (`/privacidad`), que Google pide para publicar la pantalla de consentimiento.

## Functional requirements

1. **Google Cloud:** una pantalla de consentimiento de tipo "Externo", publicada ("In production"), con el nombre de la marca, el logo, el correo de soporte, las URLs de Términos y Aviso de privacidad y solo los alcances `openid`, `email` y `profile`. Con esos alcances no se requiere la verificación de seguridad de Google.
2. **Google Cloud:** un cliente OAuth "Aplicación web" con:
   - Orígenes de JavaScript autorizados: la URL de producción y `http://localhost:3000`.
   - URI de redireccionamiento autorizado: `https://<proyecto>.supabase.co/auth/v1/callback`.
3. **Supabase:** el proveedor Google activo con ese Client ID y secreto (hecho). En URL Configuration, Site URL `https://lentes-web.lentes-web.workers.dev`, y en Redirect URLs `https://lentes-web.lentes-web.workers.dev/**` y `http://localhost:3000/**`. Se usa `/**` porque la tienda manda `redirectTo` con `?next=…` y la guía exige que la URL coincida con la lista; si no coincide, Supabase regresa a la Site URL y se pierde el destino.
4. **Unión del carrito:** después de cualquier inicio de sesión (correo o Google), si hay `cart_token`, la tienda llama `mergeCart()` una sola vez y borra el token solo con `200`. Se mueve la lógica de `LoginForm` a un escucha de `onAuthStateChange` (`SIGNED_IN`) junto al de favoritos, para no duplicarla.
5. **Aviso legal:** en la pestaña "Soy nuevo", bajo "Continuar con Google", aparece "Al continuar con Google aceptas los Términos y el Aviso de privacidad", con los mismos enlaces que el registro por correo. Solo cuando `LEGAL_REVIEWED` es verdadero, igual que hoy.
6. **Promociones:** la cuenta creada con Google queda con `marketing_opt_in = false`. El cliente puede activarlo después en `/cuenta/perfil`.
7. **Errores:** si Google o Supabase devuelven error, o el cliente cancela, `/auth/callback` lleva a `/login?error=callback` y se muestra el aviso existente "No pudimos completar el inicio de sesión".
8. **Guía:** `docs/GOOGLE-AUTH.md` documenta los pasos 1 a 3 con capturas de dónde va cada valor y cómo probar en local.

## Interfaces & contracts

N/A — sin cambios de contrato con `lentes-api`. Solo se usan `signInWithOAuth`, `exchangeCodeForSession` y el `mergeCart` existente.

Configuración (fuera del repo, en la guía):

| Valor | Dónde |
|---|---|
| Client ID y Client secret de Google | Supabase → Providers → Google |
| `https://<proyecto>.supabase.co/auth/v1/callback` | Google Cloud → Cliente OAuth → URI de redireccionamiento |
| `<origen>/auth/callback` por entorno | Supabase → URL Configuration → Redirect URLs |

## Edge cases

- **El correo ya tiene cuenta con contraseña:** Supabase vincula la identidad de Google a la misma cuenta cuando el correo de Google está verificado. El cliente entra a su cuenta de siempre, con sus pedidos.
- **Cuenta creada con Google que luego quiere contraseña:** usa "¿Olvidaste tu contraseña?" y la define.
- **El cliente cancela en Google:** vuelve a `/login?error=callback` con el aviso.
- **`next` inválido en el regreso:** `safeNext` lo reemplaza por el destino por defecto (comportamiento actual).
- **La unión del carrito falla:** el carrito anónimo se conserva (no se borra el token) y se reintenta en el siguiente inicio de sesión.
- **Pestaña del header abierta durante el regreso:** `onAuthStateChange` actualiza el header sin recargar.

## Acceptance criteria

- [x] El proveedor está activo y Google acepta el cliente OAuth y el `redirect_uri` de Supabase (verificado 2026-11-18).
- [ ] En producción y en local, "Continuar con Google" lleva a Google y regresa con sesión iniciada al `next` correcto.
- [x] Al iniciar sesión, el carrito anónimo se une a la cuenta; lo cubre `tests/auth/cart-merge.spec.ts` con correo. Con Google usa el mismo escucha de `SIGNED_IN`.
- [ ] Un visitante con productos en el carrito anónimo que entra con Google ve esos productos en su carrito de cuenta (prueba manual).
- [ ] Una cuenta nueva creada con Google aparece en `lentes-api` con nombre y correo, sin teléfono y con `marketing_opt_in = false`.
- [x] La pestaña "Soy nuevo" muestra el aviso legal bajo el botón de Google cuando `LEGAL_REVIEWED` está activo.
- [ ] Cancelar en Google muestra el aviso de error en `/login`.
- [ ] `docs/GOOGLE-AUTH.md` existe y alguien sin contexto puede seguirlo.
- [ ] Prueba E2E que intercepta el regreso de `/auth/callback` y verifica la unión del carrito. El viaje real a Google queda como prueba manual.

## Risks

- **Pantalla de Google con dominio de Supabase:** puede generar desconfianza al ver `supabase.co`. Mitigación: dominio propio en Supabase (ver Open questions) o aceptar el riesgo al inicio.
- **Pantalla de consentimiento en modo "Testing":** solo deja entrar a los usuarios de prueba. Mitigación: publicarla antes de activar el proveedor en producción.
- **Secreto de Google expuesto:** vive solo en Supabase, nunca en el repo ni en variables `NEXT_PUBLIC_*`.
