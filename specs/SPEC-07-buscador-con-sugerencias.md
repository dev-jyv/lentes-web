# SPEC 07 — Buscador con sugerencias

> **Status:** Implemented — lentes-web#3
> **Depends on:** SPEC 06
> **Date:** 2026-11-11
> **Objective:** Mostrar un panel de sugerencias bajo el buscador del header con búsquedas sugeridas, productos y una recomendación, y resultados en vivo mientras el cliente escribe.

## Context

Hoy el buscador es un formulario GET a `/buscar` sin ayuda: el cliente no sabe qué buscar hasta ver la página de resultados. SPEC 03 dejó fuera las sugerencias mientras se escribe. EyeBuyDirect abre al enfocar el buscador un panel con chips de búsquedas sugeridas, una cuadrícula de productos y una tarjeta recomendada. Todo el contenido sale de datos que la API ya expone (`/v1/catalog/facets`, `/v1/home`, `/v1/products?q=`); no se agrega nada al backend.

## Goals

- Al enfocar el buscador en escritorio se abre un panel con hasta 6 chips, hasta 6 productos y una tarjeta recomendada.
- Al escribir 2 o más caracteres, los productos del panel se reemplazan por los resultados de `/v1/products?q=` en menos de 400 ms tras dejar de escribir (sin contar la red).
- Enter o el botón de búsqueda siguen llevando a `/buscar?q=...`; el formulario funciona sin JavaScript.
- El panel es accesible con teclado y lector de pantalla (patrón combobox).

## Non-goals

- Chips o productos administrables desde lentes-admin.
- Búsquedas personalizadas por historial del cliente o "buscados recientemente".
- Corrección ortográfica o sinónimos: la búsqueda es la de `q` en la API.
- Endpoint nuevo de autocompletado en lentes-api.
- Panel en móvil a pantalla completa: en móvil se muestran solo los chips debajo del campo.

## Dependencies

- SPEC 06: posición y ancho del buscador en la fila de marca.
- API existente: `getCatalogFacets` (`/v1/catalog/facets`), `getHome` (`HomeContent.featured`, `HomeContent.secondary`) y `listProducts` con `q` y `limit`.

## Functional requirements

1. Al enfocar el campo, se abre un panel bajo el buscador, del ancho del contenedor de la página.
2. Fila 1, "Búsquedas sugeridas": hasta 6 chips. Salen de valores de facetas con productos (formas y marcas con más productos) y enlazan a la URL de catálogo filtrada, no a `/buscar`.
3. Fila 2, "Sugeridos para ti": hasta 6 `Product` de `HomeContent.featured`, primero `frame` y luego `contact_lens`, cada uno con imagen, nombre y precio desde (`formatMxn`), enlazado con `productHref`.
4. Columna derecha, "Recomendado": el primer banner de `HomeContent.secondary` con imagen y título; si no hay, la columna no se muestra.
5. Con 2 o más caracteres, tras 250 ms sin escribir, se llama `listProducts({ q, limit: 6 })` y la fila 2 muestra esos resultados con el título "Resultados".
6. Si la búsqueda no devuelve productos, la fila 2 dice "Sin resultados para «q»" y deja los chips visibles.
7. El campo tiene un botón para limpiar el texto cuando no está vacío.
8. El panel se cierra con Escape, al hacer clic fuera, al perder el foco o al navegar.
9. Las flechas recorren chips y productos; Enter abre el elemento activo; sin elemento activo, Enter envía el formulario.
10. Al enviar se registra `search_submitted` como hoy (`SearchTracker`).
11. Los datos de chips, destacados y recomendación se piden una sola vez por carga de página y se reutilizan con React Query.

## Interfaces & contracts

Consume sin cambios:
- `GET /v1/catalog/facets?category=...` → `CatalogFacets`.
- `GET /v1/home` → `HomeContent` (`featured: { frame: Product[]; contact_lens: Product[] }`, `secondary: HomeBanner[]`).
- `GET /v1/products?q=<2..80>&limit=6` → lista de `Product`.

Nuevo en el frontend: componente cliente `SearchSuggest` en `components/tienda/search-suggest.tsx`, que envuelve `SearchForm` y recibe `{ chips: NavLink[]; featured: Product[]; recommended: HomeBanner | null }` desde `SiteHeader` (server).

## Non-functional requirements

- La página sigue siendo estática/ISR: los datos iniciales vienen del servidor en `SiteHeader`; solo la búsqueda en vivo se hace en el cliente.
- Debounce de 250 ms y cancelación de la petición anterior (`AbortController` o la de React Query) para no saturar la API.
- Combobox según WAI-ARIA: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`.

## Edge cases

- API caída al cargar: sin chips ni destacados, el panel no se abre; el formulario sigue funcionando.
- API caída al escribir: la fila 2 dice "No pudimos buscar ahora" y Enter sigue llevando a `/buscar`.
- Texto de 1 carácter: no se busca; se muestran las sugerencias iniciales.
- Texto de más de 80 caracteres: `maxLength` lo impide.
- Respuesta lenta que llega después de otra más nueva: se descarta la vieja.
- Producto sin imagen: se usa el placeholder de `lib/images.ts`.
- Catálogo sin destacados: la fila 2 no aparece hasta que el cliente escribe.
- Lector de pantalla: el número de resultados se anuncia con una región `aria-live="polite"`.

## Acceptance criteria

- [ ] Dado el header de escritorio, cuando enfoco el buscador, se abre el panel con chips, productos destacados y recomendación.
- [ ] Dado el panel abierto, cuando escribo "ray" y espero, veo hasta 6 productos que coinciden y el título "Resultados".
- [ ] Dado un texto sin coincidencias, veo "Sin resultados para «texto»" y los chips siguen visibles.
- [ ] Dado el panel abierto, cuando presiono Escape o hago clic fuera, se cierra.
- [ ] Dado que uso solo teclado, puedo recorrer chips y productos con flechas y abrir uno con Enter.
- [ ] Dado JavaScript desactivado, el buscador envía a `/buscar?q=...`.
- [ ] Dada la API caída, el buscador sigue enviando a `/buscar` sin errores visibles en consola del cliente.
- [ ] Ningún texto del panel está fuera de `messages/es-MX.json`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.

## Risks

- La búsqueda en vivo sube las llamadas a `/v1/products`; si la API tiene límite de tasa por IP, hay que confirmarlo antes de publicar.
- La CSP debe permitir `connect-src` a la API desde el cliente (ya lo permite para el carrito); verificar en `lib/security-headers.ts`.
