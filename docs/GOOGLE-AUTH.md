# Acceso con Google (SPEC 26)

Cómo se configura y se prueba "Continuar con Google" en cada entorno. El código no necesita cambios por entorno; todo vive en Google Cloud y en Supabase.

## Cómo funciona

1. `GoogleButton` (`components/auth/auth-forms.tsx`) llama a `supabase.auth.signInWithOAuth({ provider: "google" })` con `redirectTo = <origen>/auth/callback?next=<destino>`. El cliente de navegador de `@supabase/ssr` guarda el verificador PKCE en una cookie.
2. Supabase lleva a Google; Google regresa a `https://<proyecto>.supabase.co/auth/v1/callback`, y Supabase regresa a `redirectTo` con `?code=…`.
3. `app/auth/callback/route.ts` canjea el `code` con `exchangeCodeForSession` y redirige a `next` (filtrado con `safeNext`). Si algo falla, o el cliente cancela, va a `/login?error=callback`.
4. Al recibir `SIGNED_IN`, `components/providers.tsx` une el carrito anónimo a la cuenta y `lib/favorites.ts` sube los favoritos locales.

## 1. Google Cloud (Google Auth Platform)

1. Crea o elige el proyecto de la empresa en https://console.cloud.google.com.
2. **Branding:** nombre de la marca, logo, correo de soporte, dominio de la tienda y las URLs `/terminos` y `/privacidad`.
3. **Audience:** tipo "Externo". Publica la app (**In production**). En "Testing" solo entran los usuarios de prueba.
4. **Data Access:** alcances `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile`. Con solo esos no se requiere la verificación de seguridad de Google (la de marca sí, para mostrar el logo).
5. **Clients → Create client → Web application:**
   - Authorized JavaScript origins: `https://lentes-web.lentes-web.workers.dev` y, para desarrollo, `http://localhost:3000`.
   - Authorized redirect URIs: `https://<proyecto>.supabase.co/auth/v1/callback` (el valor exacto aparece en Supabase, en la página del proveedor Google).
6. Copia el **Client ID** y el **Client secret**. El secreto no va al repo ni a variables `NEXT_PUBLIC_*`.

## 2. Supabase

1. **Authentication → Sign In / Providers → Google:** activa el proveedor y pega el Client ID y el secreto.
2. **Authentication → URL Configuration:**
   - Site URL: `https://lentes-web.lentes-web.workers.dev`
   - Redirect URLs: `https://lentes-web.lentes-web.workers.dev/**` y `http://localhost:3000/**`

   Se usa `/**` porque `redirectTo` lleva `?next=…`. Si la URL no coincide con la lista, Supabase regresa a la Site URL y se pierde el destino.

## 3. Comprobar la configuración sin iniciar sesión

```bash
set -a; . ./.env.local; set +a
# El proveedor debe aparecer activo
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | grep -o '"google":[a-z]*'
# Debe responder 302 hacia accounts.google.com con el redirect_uri de Supabase
curl -s -o /dev/null -w "%{redirect_url}\n" "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback"
```

Si al abrir esa URL de Google aparece `redirect_uri_mismatch`, falta el URI de redirección del paso 1.5. Con `invalid_client`, el Client ID o el secreto no coinciden.

## 4. Prueba manual

En local (`pnpm dev`) y en producción, con una cuenta de Google:

1. Agrega un producto al carrito sin sesión.
2. Abre `/login?next=/cuenta` y pulsa "Continuar con Google".
3. Debes volver a `/cuenta` con sesión iniciada y el producto en el carrito.
4. Repite cancelando en la pantalla de Google: debes ver "No pudimos completar el inicio de sesión" en `/login`.

La parte automatizable está en `tests/auth/google.spec.ts` (salida hacia Google y error del callback) y `tests/auth/cart-merge.spec.ts` (unión del carrito al iniciar sesión).

## Notas

- Una cuenta con contraseña y el mismo correo verificado en Google se vincula sola: el cliente entra a su cuenta de siempre.
- Quien se registra con Google queda con `marketing_opt_in = false` y sin teléfono; puede completarlos en `/cuenta/perfil`.
- La pantalla de Google muestra `<proyecto>.supabase.co`. Mostrar la marca requiere el dominio propio de Supabase Auth, que queda pendiente hasta tener dominio de producción.
