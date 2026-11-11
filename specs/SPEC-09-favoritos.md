# SPEC 09 — Favoritos

> **Status:** Draft
> **Depends on:** SPEC 06, SPEC 08
> **Date:** 2026-11-11
> **Objective:** Permitir que el cliente guarde productos en una lista de favoritos y la consulte desde un popover del header.

## Context

No existe forma de guardar un producto para después; SPEC 03 dejó los favoritos fuera. En armazones, donde el cliente compara formas y colores antes de comprar, es una función esperada. EyeBuyDirect muestra un corazón en el header que abre "Mi lista (N)" con imagen, nombre, color, precio y un botón para quitar, más "Ver mi lista". Hace falta almacenamiento en lentes-api para clientes con sesión y en el navegador para anónimos, con fusión al iniciar sesión, igual que el carrito.

## Goals

- Desde la tarjeta de producto y la ficha, el cliente agrega o quita un favorito con un clic en un corazón.
- El header muestra un corazón con contador; al abrirlo se ven los primeros 3 favoritos y un botón "Ver mi lista".
- `/cuenta/favoritos` lista todos los favoritos con opción de quitar o ir a la ficha.
- Los favoritos anónimos se conservan al iniciar sesión.
- Con sesión, los favoritos se ven en cualquier dispositivo.

## Non-goals

- Compartir la lista, varias listas o notas por favorito.
- Avisos de baja de precio o de vuelta a stock.
- Agregar al carrito desde el popover (el armazón requiere elegir micas; la lente, la receta).
- Indicador "!" de la imagen de referencia: el contador muestra el número.
- Guardar el color o la variante: un favorito es el producto (decisión del usuario).
- Ver favoritos en lentes-admin, como productos más guardados (spec futuro).

## Dependencies

- SPEC 06: espacio del icono en la fila de marca.
- SPEC 08: el inicio de sesión dispara la fusión.
- lentes-api: tabla y endpoints nuevos (ver Interfaces). El contrato se define en `lentes-api/api/openapi.yaml` y llega aquí con `pnpm api:sync`.

## Functional requirements

1. `ProductCard` y la ficha de producto (`/lentes/[slug]`, `/armazones/[slug]`) muestran un botón corazón con `aria-pressed`.
2. Sin sesión, el favorito se guarda en `localStorage` (clave `favorites`, lista de `{ product_id, added_at }`), máximo 50.
3. Con sesión, el favorito se guarda con `PUT /v1/me/favorites/{productId}` y se quita con `DELETE`.
4. Al iniciar sesión, si hay favoritos locales, se envían a `POST /v1/me/favorites/merge` y se borran del navegador si la respuesta es 200.
5. Un favorito es siempre el producto, sin color ni variante.
6. El icono del header muestra el contador (oculto en 0) y abre un popover "Mis favoritos (N)" con los 3 más recientes: imagen, nombre, precio desde y botón quitar.
7. El popover termina con "Ver mis favoritos" a `/cuenta/favoritos`; sin sesión, ese botón lleva a `/login?next=/cuenta/favoritos`.
8. Lista vacía: el popover dice "Aún no tienes favoritos" y enlaza a Armazones.
9. `/cuenta/favoritos` (protegida, se agrega a `PROTECTED` de `lib/supabase/proxy.ts`) lista todos en cuadrícula con `ProductCard`.
10. Se registra el evento `favorite_added` / `favorite_removed` en PostHog (`lib/analytics.ts`).

## Interfaces & contracts

lentes-api (nuevo, autenticado con `bearerAuth`):
- `GET /v1/me/favorites` → `200 { items: Favorite[] }`, orden por `added_at` descendente.
- `PUT /v1/me/favorites/{productId}` sin cuerpo → `200 Favorite` (idempotente).
- `DELETE /v1/me/favorites/{productId}` → `204`; `404` si no existía.
- `POST /v1/me/favorites/merge` body `{ items: { product_id: uuid }[] }` (máx. 50) → `200 { items: Favorite[] }`.
- `Favorite`: `{ product: Product, added_at: date-time }`.
- Tabla `favorites (customer_id, product_id, added_at)`, PK `(customer_id, product_id)`, límite de 200 por cliente (`409` al exceder).

lentes-web:
- `lib/favorites.ts`: `readLocalFavorites()`, `writeLocalFavorites()`, `useFavorites()` (hook que elige local o API según sesión).
- Mensajes en `favorites.*` de `messages/es-MX.json`.

## Non-functional requirements

- Las páginas del catálogo siguen estáticas/ISR: el estado del corazón se lee en el cliente tras hidratar.
- Accesos a `localStorage` envueltos en `try/catch` (modo privado), como `PromoBar`.

## Edge cases

- Producto desactivado o borrado: la API no lo devuelve; en local, se descarta al no encontrarlo en `listProducts`.
- Doble clic rápido en el corazón: la UI es optimista y la operación es idempotente.
- Fallo de red al marcar: se revierte el corazón y se muestra un aviso.
- `localStorage` bloqueado: los favoritos anónimos viven solo en memoria de la pestaña.
- Fusión con duplicados: la API conserva el `added_at` más antiguo.
- Más de 50 favoritos locales: se descartan los más viejos.
- Límite de 200 en la API: `409` con `detail` en español, mostrado al cliente.
- Producto agotado (`from_price_cents` nulo): se muestra en favoritos con "Agotado".

## Acceptance criteria

- [ ] Dado que no tengo sesión, cuando marco el corazón de un armazón, el contador del header sube a 1 y persiste al recargar.
- [ ] Dado ese favorito local, cuando inicio sesión, aparece en `/cuenta/favoritos` y en otro navegador con la misma cuenta.
- [ ] Dado que tengo 9 favoritos, el popover dice "Mis favoritos (9)" y muestra los 3 más recientes.
- [ ] Dado el popover, cuando quito un favorito con la X, desaparece y el contador baja.
- [ ] Dado que no tengo favoritos, el popover dice "Aún no tienes favoritos".
- [ ] Dado un fallo de red al marcar, el corazón vuelve a su estado anterior y veo un aviso.
- [ ] Dado `/cuenta/favoritos` sin sesión, `proxy.ts` redirige a `/login?next=/cuenta/favoritos`.
- [ ] El contrato nuevo está en `openapi/openapi.yaml` vía `pnpm api:sync` y el cliente generado lo usa.
- [ ] Ningún texto nuevo está fuera de `messages/es-MX.json`.

## Risks

- Requiere cambio coordinado en lentes-api (migración y endpoints) antes de la parte con sesión; la parte local puede salir primero.
- `docs/BRAND.md` y SPEC 03 listan favoritos como excluidos; hay que actualizar `docs/BRAND.md` al implementar.
