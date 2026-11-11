# SPEC 10 — Acceso y registro con pestañas

> **Status:** Draft
> **Depends on:** SPEC 08
> **Date:** 2026-11-11
> **Objective:** Unir `/login` y `/registro` en una página con pestañas "Iniciar sesión" y "Soy nuevo", con un registro ampliado que pide título, teléfono y fecha de nacimiento opcionales y mide la fuerza de la contraseña.

## Context

Hoy `/login` y `/registro` son páginas separadas con `AuthShell`, y el registro solo pide nombre, email y contraseña. EyeBuyDirect usa una sola página con dos pestañas; "Soy nuevo" ofrece el registro social arriba y debajo el formulario con título, nombre, email, contraseña con medidor de fuerza, fecha de nacimiento, teléfono con consentimiento y botón "Crear cuenta". El perfil `Customer` de lentes-api ya tiene `phone` y `marketing_opt_in`, pero no título ni fecha de nacimiento.

## Goals

- `/login` y `/registro` muestran la misma página con dos pestañas; la URL decide la pestaña activa y cambiar de pestaña cambia la URL.
- "Soy nuevo" muestra el botón de Google arriba y el formulario de email debajo.
- El formulario pide: título*, nombre completo*, email*, contraseña* con medidor de fuerza, fecha de nacimiento (opcional), teléfono (opcional) y consentimiento de marketing (opcional).
- Al confirmar el correo, el perfil del cliente en lentes-api tiene título, teléfono, fecha de nacimiento y `marketing_opt_in` guardados.

## Non-goals

- Apple y Amazon como proveedores.
- "Recordarme": Supabase mantiene la sesión por defecto.
- Selector de país del teléfono: el teléfono es mexicano (+52, 10 dígitos).
- Verificación del teléfono por SMS.
- Editar título y fecha de nacimiento en `/cuenta` (spec futuro).
- Cambiar `/recuperar` o `/cuenta/contrasena`.

## Dependencies

- SPEC 08: `FloatingField` y el refactor de `LoginForm`.
- lentes-api: columnas y campos nuevos en `Customer`/`CustomerUpdate` (ver Interfaces), sincronizados con `pnpm api:sync`.
- Aviso de privacidad: debe mencionar fecha de nacimiento y teléfono antes de pedirlos.

## Functional requirements

1. `app/(auth)/login/page.tsx` y `app/(auth)/registro/page.tsx` renderizan el mismo componente `AuthTabs` con `initial="login" | "register"`.
2. Las pestañas siguen el patrón WAI-ARIA Tabs; la activa tiene subrayado de color `primary`. Cambiar de pestaña usa `router.replace` a `/login` o `/registro`, conservando `next`.
3. Pestaña "Iniciar sesión": `LoginForm` actual con `FloatingField`.
4. Pestaña "Soy nuevo": título "Regístrate con…", botón de Google, separador "O regístrate con tu correo", nota "*Información obligatoria".
5. Campo título: select con "Sr.", "Sra." y "Prefiero no decirlo"; obligatorio.
6. Medidor de contraseña con tres segmentos y etiqueta "Seguridad: débil / media / fuerte", calculado en el cliente (longitud ≥ 8, mezcla de mayúsculas, números y símbolos). Solo informa; la regla mínima sigue siendo 8 caracteres.
7. Fecha de nacimiento: `input type="date"`, opcional; debe ser de una persona de 18 a 110 años.
8. Teléfono: opcional, 10 dígitos, prefijo fijo "+52" visible.
9. Casilla de marketing, desmarcada por defecto, con enlace a Términos y Privacidad; texto en `messages/es-MX.json`. Solo se muestra activa si hay teléfono o email.
10. Al enviar, `supabase.auth.signUp` guarda en `options.data`: `full_name`, `title`, `phone`, `birth_date`, `marketing_opt_in`.
11. lentes-api copia esos datos de `raw_user_meta_data` al crear el `Customer` (mismo mecanismo que `full_name` hoy).
12. Botón "Crear cuenta" a todo el ancho. Tras éxito se abre un modal centrado (`Dialog` de `@base-ui/react`) con un icono de check en círculo, el título "¡Listo!", el texto "Te damos la bienvenida a {{brand}}. Te enviamos un correo para confirmar tu cuenta." y un botón "Continuar" que cierra el modal y lleva a `safeNext(next)` o al home. El texto no promete datos de cuenta en el correo: Supabase envía el enlace de confirmación.
13. Los campos de teléfono y fecha llevan la clase `ph-no-capture`.

## Interfaces & contracts

lentes-api:
- `Customer` y `CustomerUpdate` agregan `title: "mr" | "ms" | "unspecified" | null` y `birth_date: date | null`.
- Columnas `customers.title text null` (check en los 3 valores) y `customers.birth_date date null`.
- La creación del cliente lee `title`, `phone`, `birth_date`, `marketing_opt_in` de los metadatos de Supabase y los valida igual que `PUT /v1/me` (valores inválidos se guardan como `null`).

lentes-web:
- `AuthTabs({ initial: "login" | "register"; next?: string })` en `components/auth/auth-tabs.tsx`.
- `RegisterForm` amplía su esquema zod con `title`, `birth_date?`, `phone?`, `marketing_opt_in`.
- `passwordStrength(pw: string): 0 | 1 | 2 | 3` en `lib/password-strength.ts`, con su autoverificación.

## Non-functional requirements

- Privacidad: fecha de nacimiento y teléfono son datos personales; no se envían a PostHog ni a Sentry y sus campos llevan `ph-no-capture`.
- Accesibilidad: cada campo con etiqueta asociada, errores con `aria-invalid` y `aria-describedby`; la pestaña activa con `aria-selected`.

## Edge cases

- Email ya registrado: Supabase responde éxito silencioso o error; se muestra `auth.register.failed` o `checkEmail` sin revelar si el correo existe.
- Fecha futura o de menor de 18: error "Debes ser mayor de edad para crear una cuenta".
- Teléfono con espacios o guiones: se normaliza a 10 dígitos antes de validar.
- Registro con Google: no pide título ni fecha; quedan `null`.
- `next` inválido al cambiar de pestaña: se descarta con `safeNext`.
- Metadatos manipulados desde el cliente: lentes-api valida y descarta valores fuera de rango.
- Turnstile sin completar: `auth.completeCaptcha`.
- Cierre del modal de éxito con Escape o clic fuera: mismo efecto que "Continuar"; el formulario no se puede reenviar.

## Acceptance criteria

- [ ] Dado `/login`, veo la pestaña "Iniciar sesión" activa; al hacer clic en "Soy nuevo", la URL cambia a `/registro` sin recargar.
- [ ] Dado `/registro?next=/checkout`, al cambiar a "Iniciar sesión" la URL es `/login?next=/checkout`.
- [ ] Dado el formulario de registro, cuando escribo una contraseña, el medidor cambia entre débil, media y fuerte.
- [ ] Dada una fecha de nacimiento de alguien de 15 años, veo el error de mayoría de edad.
- [ ] Dado un registro completo con teléfono y fecha, tras confirmar el correo `GET /v1/me` devuelve `title`, `phone`, `birth_date` y `marketing_opt_in`.
- [ ] Dado un registro sin campos opcionales, se crea la cuenta y esos campos son `null`.
- [ ] Dado un registro exitoso, veo el modal "¡Listo!" con el aviso de correo de confirmación; "Continuar" me lleva a `next` o al home, y Escape lo cierra con el mismo destino.
- [ ] Teléfono y fecha llevan `ph-no-capture`.
- [ ] Ningún texto nuevo está fuera de `messages/es-MX.json`.

## Risks

- Pedir fecha de nacimiento y título agrega fricción al registro y datos personales que la LFPDPPP obliga a justificar en el aviso de privacidad.
- Guardar datos en `raw_user_meta_data` los deja editables por el cliente vía Supabase; la fuente de verdad debe ser `customers` en lentes-api.

## Open questions

- ¿Para qué se usará la fecha de nacimiento (promociones de cumpleaños, verificación de edad)? El aviso de privacidad debe decirlo antes de pedirla.
- ¿El título se usa en algún correo o pantalla? Si no, se puede quitar y reducir fricción.
- ¿Existe ya una página de Términos y de Privacidad a la que enlazar la casilla de marketing?
