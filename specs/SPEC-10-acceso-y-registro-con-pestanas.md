# SPEC 10 — Acceso y registro con pestañas

> **Status:** Implemented — lentes-api#11, lentes-web#3
> **Depends on:** SPEC 08
> **Date:** 2026-11-11
> **Objective:** Unir `/login` y `/registro` en una página con pestañas "Iniciar sesión" y "Soy nuevo", con un registro que mide la fuerza de la contraseña y pide teléfono y consentimiento de marketing opcionales enlazados a páginas nuevas de Términos y Privacidad.

## Context

Hoy `/login` y `/registro` son páginas separadas con `AuthShell`, y el registro solo pide nombre, email y contraseña. EyeBuyDirect usa una sola página con dos pestañas; "Soy nuevo" ofrece el registro social arriba y debajo el formulario con nombre, email, contraseña con medidor de fuerza, teléfono con consentimiento y botón "Crear cuenta", y al terminar muestra un modal de bienvenida. El perfil `Customer` de lentes-api ya tiene `phone` y `marketing_opt_in`. La tienda no tiene páginas de Términos ni de Privacidad para enlazar el consentimiento.

## Goals

- `/login` y `/registro` muestran la misma página con dos pestañas; la URL decide la pestaña activa y cambiar de pestaña cambia la URL.
- "Soy nuevo" muestra el botón de Google arriba y el formulario de email debajo.
- El formulario pide nombre completo*, email*, contraseña* con medidor de fuerza, teléfono (opcional) y consentimiento de marketing (opcional).
- Al confirmar el correo, el perfil del cliente en lentes-api tiene `phone` y `marketing_opt_in` guardados.
- Existen `/terminos` y `/privacidad` con un borrador marcado como no vigente, listo para revisión legal; los enlaces públicos y la casilla de marketing solo se activan cuando el texto está revisado.
- Tras registrarse, el cliente ve un modal de bienvenida que le pide confirmar su correo.

## Non-goals

- Título (Sr./Sra.) y fecha de nacimiento: el usuario decidió no pedirlos.
- Apple y Amazon como proveedores.
- "Recordarme": Supabase mantiene la sesión por defecto.
- Selector de país del teléfono: el teléfono es mexicano (+52, 10 dígitos).
- Verificación del teléfono por SMS.
- Texto legal definitivo: el borrador requiere el visto bueno de un abogado antes de activarse.
- Cambiar `/recuperar` o `/cuenta/contrasena`.

## Dependencies

- SPEC 08: `FloatingField` y el refactor de `LoginForm`.
- lentes-api: la creación del `Customer` debe leer `phone` y `marketing_opt_in` de los metadatos de Supabase (hoy solo lee `full_name`). Sin cambios de esquema.
- Revisión legal del borrador de Términos y Aviso de privacidad.

## Functional requirements

1. `app/(auth)/login/page.tsx` y `app/(auth)/registro/page.tsx` renderizan el mismo componente `AuthTabs` con `initial="login" | "register"`.
2. Las pestañas siguen el patrón WAI-ARIA Tabs; la activa tiene subrayado de color `primary`. Cambiar de pestaña usa `router.replace` a `/login` o `/registro`, conservando `next`.
3. Pestaña "Iniciar sesión": `LoginForm` actual con `FloatingField`.
4. Pestaña "Soy nuevo": título "Regístrate con…", botón de Google, separador "O regístrate con tu correo", nota "*Información obligatoria".
5. Medidor de contraseña con tres segmentos y etiqueta "Seguridad: débil / media / fuerte", calculado en el cliente (longitud ≥ 8, mezcla de mayúsculas, números y símbolos). Solo informa; la regla mínima sigue siendo 8 caracteres.
6. Teléfono: opcional, 10 dígitos, prefijo fijo "+52" visible.
7. Casilla de marketing, desmarcada por defecto, con el texto de consentimiento y enlaces a `/terminos` y `/privacidad`; texto en `messages/es-MX.json`. Solo se muestra con `LEGAL_REVIEWED = true` (requisito 15); mientras tanto `marketing_opt_in` se envía en `false`.
8. Bajo el botón, una nota: "Al crear tu cuenta aceptas los Términos y el Aviso de privacidad", con ambos enlaces. Solo se muestra con `LEGAL_REVIEWED = true`.
9. Al enviar, `supabase.auth.signUp` guarda en `options.data`: `full_name`, `phone`, `marketing_opt_in`.
10. lentes-api copia `phone` y `marketing_opt_in` de `raw_user_meta_data` al crear el `Customer`, validándolos igual que `PUT /v1/me` (valores inválidos se guardan como `null` y `false`).
11. Botón "Crear cuenta" a todo el ancho. Tras éxito se abre un modal centrado (`Dialog` de `@base-ui/react`) con un icono de check en círculo, el título "¡Listo!", el texto "Te damos la bienvenida a {{brand}}. Te enviamos un correo para confirmar tu cuenta." y un botón "Continuar" que cierra el modal y lleva a `safeNext(next)` o al home. El texto no promete datos de cuenta en el correo: Supabase envía el enlace de confirmación.
12. El campo de teléfono lleva la clase `ph-no-capture`.
13. Páginas estáticas `app/(tienda)/terminos/page.tsx` y `app/(tienda)/privacidad/page.tsx` con `metadata` propia. Los enlaces en `SiteFooter` solo aparecen con `LEGAL_REVIEWED = true`.
14. El texto legal vive en `messages/es-MX.json` (claves `legal.terms.*` y `legal.privacy.*`) y se renderiza con `rich`. Es un borrador redactado en la implementación para un comercio en línea de lentes en México conforme a la LFPDPPP: identidad del responsable con marcadores `[RAZÓN SOCIAL]`, `[DOMICILIO]` y `[CORREO DE CONTACTO]`, datos que se recaban (incluidos datos de salud: recetas), finalidades primarias y secundarias, derechos ARCO, transferencias (Supabase, Mercado Pago, PostHog, Sentry, Cloudflare) y cambios al aviso.
15. `lib/legal.ts` exporta `LEGAL_REVIEWED = false`. Mientras sea `false`, ambas páginas muestran arriba un aviso "Borrador pendiente de revisión legal; no vigente", llevan `robots: { index: false }` y no se enlazan desde ningún lugar. Cambiarlo a `true` es una decisión del negocio tras la revisión.

## Interfaces & contracts

lentes-api:
- Sin cambios en `Customer` ni `CustomerUpdate`.
- La creación del cliente lee `phone` y `marketing_opt_in` de los metadatos de Supabase.

lentes-web:
- `AuthTabs({ initial: "login" | "register"; next?: string })` en `components/auth/auth-tabs.tsx`.
- `RegisterForm` amplía su esquema zod con `phone?` y `marketing_opt_in`.
- `passwordStrength(pw: string): 0 | 1 | 2 | 3` en `lib/password-strength.ts`, con su autoverificación.
- Rutas nuevas `/terminos` y `/privacidad`.

## Non-functional requirements

- Privacidad: el teléfono es dato personal; no se envía a PostHog ni a Sentry y su campo lleva `ph-no-capture`.
- Accesibilidad: cada campo con etiqueta asociada, errores con `aria-invalid` y `aria-describedby`; la pestaña activa con `aria-selected`.
- `/terminos` y `/privacidad` son estáticas.

## Edge cases

- Email ya registrado: Supabase responde éxito silencioso o error; se muestra el modal o `auth.register.failed` sin revelar si el correo existe.
- Teléfono con espacios o guiones: se normaliza a 10 dígitos antes de validar.
- Registro con Google: `phone` queda `null` y `marketing_opt_in` en `false`.
- `next` inválido al cambiar de pestaña: se descarta con `safeNext`.
- Metadatos manipulados desde el cliente: lentes-api valida y descarta valores fuera de rango.
- Turnstile sin completar: `auth.completeCaptcha`.
- Cierre del modal de éxito con Escape o clic fuera: mismo efecto que "Continuar"; el formulario no se puede reenviar.

## Acceptance criteria

- [ ] Dado `/login`, veo la pestaña "Iniciar sesión" activa; al hacer clic en "Soy nuevo", la URL cambia a `/registro` sin recargar.
- [ ] Dado `/registro?next=/checkout`, al cambiar a "Iniciar sesión" la URL es `/login?next=/checkout`.
- [ ] Dado el formulario de registro, cuando escribo una contraseña, el medidor cambia entre débil, media y fuerte.
- [ ] Dado un teléfono con 9 dígitos, veo un error de formato.
- [ ] Dado un registro con teléfono y consentimiento, tras confirmar el correo `GET /v1/me` devuelve `phone` y `marketing_opt_in: true`.
- [ ] Dado un registro sin campos opcionales, `phone` es `null` y `marketing_opt_in` es `false`.
- [ ] Dado un registro exitoso, veo el modal "¡Listo!" con el aviso de correo de confirmación; "Continuar" me lleva a `next` o al home, y Escape lo cierra con el mismo destino.
- [ ] El formulario no pide título ni fecha de nacimiento.
- [ ] Con `LEGAL_REVIEWED = false`, `/terminos` y `/privacidad` cargan con el aviso de borrador y `noindex`, y no hay enlaces a ellas ni casilla de marketing en el registro.
- [ ] Con `LEGAL_REVIEWED = true`, desaparece el aviso, se quitan el `noindex`, aparecen los enlaces en el pie y el registro, y se muestra la casilla de marketing.
- [ ] El borrador contiene los marcadores `[RAZÓN SOCIAL]`, `[DOMICILIO]` y `[CORREO DE CONTACTO]` en lugar de datos inventados.
- [ ] El teléfono lleva `ph-no-capture`.
- [ ] Ningún texto nuevo está fuera de `messages/es-MX.json`.

## Risks

- Guardar datos en `raw_user_meta_data` los deja editables por el cliente vía Supabase; la fuente de verdad debe ser `customers` en lentes-api.
- Un borrador legal puede tener errores con consecuencias legales; `LEGAL_REVIEWED` debe quedar en `false` hasta el visto bueno de un abogado, y nadie debe cambiarlo como parte de otra tarea.
