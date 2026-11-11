# SPEC 08 — Inicio de sesión en popover

> **Status:** Draft
> **Depends on:** SPEC 06
> **Date:** 2026-11-11
> **Objective:** Permitir iniciar sesión desde un popover que se abre en "Iniciar sesión ▾" del header, sin salir de la página actual.

## Context

Hoy la cuenta del header es un enlace a `/cuenta`; sin sesión, `proxy.ts` redirige a `/login` y el cliente pierde la página donde estaba. EyeBuyDirect abre un panel bajo "Sign In" con email, contraseña, "¿Olvidaste tu contraseña?", el botón principal, los proveedores sociales y "¿No tienes cuenta? Regístrate". La lógica de `LoginForm` (Supabase, Turnstile, fusión del carrito) ya existe; este spec la muestra en otro lugar.

## Goals

- Sin sesión, "Iniciar sesión ▾" abre un popover con el formulario de login completo.
- Al iniciar sesión desde el popover, el cliente se queda en la misma página, con el carrito anónimo fusionado.
- Con sesión, el mismo control abre un menú de cuenta: Mi cuenta, Mis pedidos, Mis recetas, Cerrar sesión.
- `/login` sigue existiendo para redirecciones de `proxy.ts` y enlaces de correo.

## Non-goals

- Proveedores Apple y Amazon: solo Google, que ya funciona.
- "Recordarme": Supabase mantiene la sesión por defecto; no se agrega casilla.
- Cambiar la política de contraseñas o Turnstile.
- Popover en móvil: en móvil el control lleva a `/login`.

## Dependencies

- SPEC 06: ubicación de la acción de cuenta en la fila de marca.
- Código existente: `LoginForm`, `GoogleButton`, `useTurnstile`, `mergeCart`, `safeNext`.

## Functional requirements

1. En escritorio, sin sesión, "Iniciar sesión ▾" abre un popover (`@base-ui/react` Popover) alineado a la derecha del control, con una marca de color bajo el control mientras está abierto.
2. El popover contiene: título "Iniciar sesión", email, contraseña con botón mostrar/ocultar, enlace "¿Olvidaste tu contraseña?", botón principal, separador "O entra con", botón de Google, y "¿No tienes cuenta? Regístrate" enlazado a `/registro`.
3. Los campos usan etiqueta flotante sobre el borde (estilo de la imagen de referencia), implementada en `components/ui/input.tsx` o un componente nuevo `FloatingField`.
4. Al iniciar sesión con éxito: se fusiona el carrito, se cierra el popover y se hace `router.refresh()` en la misma URL.
5. Con Google, `next` es la URL actual (validada con `safeNext`).
6. Con sesión, el control muestra el primer nombre y abre un menú con Mi cuenta, Mis pedidos, Mis recetas y Cerrar sesión.
7. "Cerrar sesión" llama `supabase.auth.signOut()` y refresca la página; si la página es privada, `proxy.ts` redirige a `/login`.
8. `LoginForm` se refactoriza para aceptar `onSuccess` en vez de navegar siempre a `target`; `/login` conserva su comportamiento.
9. Textos nuevos en `messages/es-MX.json`.

## Interfaces & contracts

- `LoginForm({ next?: string; onSuccess?: () => void })`: sin `onSuccess`, navega a `safeNext(next)` como hoy.
- `FloatingField`: `{ id, label, type?, error?, autoComplete?, reg }`, misma forma que el `Row` actual.
- Sin cambios de API.

## Non-functional requirements

- Foco atrapado dentro del popover mientras está abierto; Escape lo cierra y devuelve el foco al control.
- Turnstile debe renderizar dentro del popover; si su iframe no cabe, el popover crece en alto, nunca en ancho.

## Edge cases

- Credenciales incorrectas: mensaje `auth.wrongCredentials` dentro del popover, sin cerrarlo.
- Turnstile sin completar: mensaje `auth.completeCaptcha`.
- Supabase no configurado: el control lleva a `/login` y no abre popover.
- Fallo al fusionar el carrito: se conserva el carrito anónimo, como hoy.
- Clic fuera con datos escritos: el popover se cierra y conserva lo escrito mientras la página no cambie.
- Sesión que expira con el menú de cuenta abierto: al refrescar, el control vuelve a "Iniciar sesión".

## Acceptance criteria

- [ ] Dado que no tengo sesión en una ficha de producto, cuando abro "Iniciar sesión ▾" y entro con datos válidos, sigo en la misma ficha y el header muestra mi nombre.
- [ ] Dado un carrito anónimo con productos, cuando inicio sesión desde el popover, el carrito conserva esos productos.
- [ ] Dadas credenciales inválidas, veo el error dentro del popover y no se cierra.
- [ ] Dado el popover abierto, Escape lo cierra y el foco vuelve a "Iniciar sesión".
- [ ] Dado que tengo sesión, el control abre un menú con Mi cuenta, Mis pedidos, Mis recetas y Cerrar sesión.
- [ ] Dado un acceso a `/cuenta` sin sesión, `proxy.ts` sigue redirigiendo a `/login?next=/cuenta`.
- [ ] Dado un móvil, el control de cuenta lleva a `/login`.
- [ ] Ningún texto nuevo está fuera de `messages/es-MX.json`.

## Risks

- Mostrar el formulario en todas las páginas carga Turnstile y Supabase en el bundle del header; hay que cargarlos solo al abrir el popover (import dinámico) para no penalizar el catálogo.
- Las páginas del catálogo son estáticas/ISR: el nombre del cliente debe leerse en el cliente, no en el servidor, para no romper el caché.
