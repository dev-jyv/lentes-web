# SPEC 18 — Etiquetas de valores ocultos del catálogo

> **Status:** Implemented — lentes-api#22, lentes-web#13
> **Depends on:** SPEC 16
> **Date:** 2026-11-14
> **Objective:** Hacer que la tienda muestre la etiqueta y el color administrados de un valor de catálogo oculto en los productos que todavía lo usan.

## Context

SPEC 16 hizo administrables los catálogos de atributos. Ocultar un valor (`active = false`) lo quita de filtros y megamenú, pero los productos que ya lo tienen lo conservan y "su ficha sigue mostrando la etiqueta" (punto 10).

`GET /v1/catalogs` solo devuelve valores activos (punto 12). Por eso, al ocultar un valor, la tienda no conoce su etiqueta administrada: fichas, tarjetas, carrito y estado de pedido muestran la etiqueta de respaldo de `messages/es-MX.json` o, si el valor se creó desde el admin, su código legible ("Ojo de gato" puede volverse "Cat eye" o "Cat_eye"). Un color oculto pierde su `swatch`. Es el hueco que quedó documentado en `lib/catalog.ts` al implementar SPEC 16.

## Goals

- Un valor oculto se muestra en la tienda con la etiqueta y el `swatch` que tiene en el admin.
- Los valores ocultos siguen fuera de filtros, megamenú y listas de opciones.
- Los clientes actuales de `GET /v1/catalogs` no cambian de comportamiento.

## Non-goals

- Cambiar las reglas de ocultar, borrar o reordenar valores de SPEC 16.
- Mostrar en la tienda que un valor está oculto.
- Cambios en `lentes-admin`: ya recibe los valores ocultos en `GET /v1/admin/catalogs`.
- Etiquetas en pedidos históricos: `order_items` no guarda atributos de catálogo.

## Functional requirements

### API

1. `GET /v1/catalogs` acepta `include_hidden` (booleano, `false` por defecto).
2. Sin `include_hidden` la respuesta tiene los mismos valores que hoy: solo los activos, en orden.
3. Con `include_hidden=true` incluye también los valores ocultos, en el mismo orden de `position`.
4. Cada valor de la respuesta agrega `active` (booleano), en ambos modos.
5. Ambos modos responden con `Cache-Control: public, s-maxage=300`.

### Tienda (`lentes-web`)

6. `loadCatalogs()` pide `GET /v1/catalogs?include_hidden=true`.
7. `catalog.entries(kind)`, que alimenta filtros, megamenú, chips y opciones, devuelve solo valores con `active = true`.
8. `catalog.label(kind, code)` y `catalog.swatch(code)` resuelven también los valores ocultos con su etiqueta y `swatch` de la API.
9. `catalog.visible(kind, code)` devuelve `false` para un valor oculto, con lo que el chip de filtro de SPEC 16 (punto 17) sigue igual.
10. Si la API falla, se conserva el respaldo de SPEC 16: etiquetas de `messages/es-MX.json` y código legible.

## Interfaces & contracts

| Ruta | Cambio |
|---|---|
| `GET /v1/catalogs` | Parámetro de consulta `include_hidden: boolean` (opcional, `false`). |

| Esquema | Cambio |
|---|---|
| Valor de `PublicCatalogs` (`{ code, label, swatch? }`) | Agrega `active: boolean`, requerido. |

El cambio es compatible: un cliente que no envía `include_hidden` recibe los mismos valores y puede ignorar `active`.

## Non-functional requirements

- La respuesta con `include_hidden=true` sigue por debajo de 10 KB y de 50 ms p95, como pide SPEC 16.

## Edge cases

- **Valor oculto y renombrado:** la ficha muestra la etiqueta nueva.
- **Color oculto:** la muestra de color de la ficha usa su `swatch`.
- **Valor oculto creado desde el admin (sin respaldo en `messages`):** se muestra con su etiqueta de la API, no con el código.
- **Enlace guardado con un filtro oculto:** muestra los productos, el chip lleva la etiqueta administrada y el filtro no aparece marcado en la lista.
- **Despliegue de la API antes que la tienda:** la tienda vieja no envía `include_hidden` y no ve cambios.
- **API caída:** respaldo de SPEC 16.

## Acceptance criteria

- [ ] `GET /v1/catalogs` sin parámetro devuelve los mismos valores que antes, cada uno con `active: true`.
- [ ] Con `include_hidden=true` aparece un valor oculto con `active: false` en su posición.
- [ ] Al ocultar y renombrar una forma usada por un armazón, la ficha y la tarjeta muestran la etiqueta nueva y el filtro de forma no la lista.
- [ ] Al ocultar un color usado por una variante, la ficha muestra su muestra de color y su etiqueta administrada.
- [ ] Un enlace con el filtro oculto muestra el chip con la etiqueta administrada.
- [ ] Con la API caída, la tienda usa las etiquetas de respaldo.
- [ ] Las pruebas de SPEC 16 en `lentes-api` siguen pasando.
