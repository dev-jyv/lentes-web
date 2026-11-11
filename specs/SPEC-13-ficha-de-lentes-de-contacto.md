# SPEC 13 — Ficha de lentes de contacto

> **Status:** Approved
> **Depends on:** SPEC 12
> **Date:** 2026-11-11
> **Objective:** Rediseñar la ficha `/lentes/[slug]` con galería, precio por caja, cajas por ojo y una sección de detalles del lente, siguiendo la ficha de GlassesUSA.

## Context

La ficha actual muestra una sola imagen, insignias, el precio desde, la descripción y `RxSelector` con una sola cantidad de cajas para ambos ojos. La ficha de referencia de GlassesUSA (ACUVUE OASYS for Astigmatism) tiene migas de pan, galería con miniaturas, marca enlazada y fabricante, precio por caja con el tipo de empaque ("Semanal, 6 piezas"), un selector de cajas por ojo, un botón para continuar, una lista "Detalles del lente" y una sección "Acerca de". SPEC 12 aporta los datos que faltan.

## Goals

- La ficha tiene migas de pan, galería con miniaturas, marca enlazada a su página y fabricante.
- El precio se muestra por caja junto al reemplazo y las piezas por caja.
- El cliente elige cuántas cajas lleva para cada ojo por separado.
- Una sección "Detalles del lente" lista los atributos disponibles y oculta los que son `null`.
- El subtotal se actualiza con las cajas de cada ojo antes de agregar al carrito.

## Non-goals

- Reseñas, calificaciones, Trustpilot y preguntas frecuentes.
- Financiamiento (Klarna, PayPal, Afterpay), seguros, FSA/HSA o garantías de mejor precio.
- Promesas de envío gratis, devoluciones gratis o tiempos de envío que la tienda no ofrece.
- Productos relacionados.
- Cambiar la validación de receta ni la verificación con el oculista.

## Dependencies

- SPEC 12: `manufacturer`, `uv_blocking`, `visibility_tint`, `package_note` en `Product`.
- Código existente: `RxSelector`, `getProduct`, `imageSrc`, `formatMxn`, `lensTypeLabel`, `replacementLabel`, `addCartItem`.

## Functional requirements

1. Migas de pan: Inicio › Lentes de contacto › {marca} › {producto}, con `BreadcrumbList` en JSON-LD.
2. Galería: imagen principal y miniaturas de `images` (por `position`); al elegir una miniatura cambia la principal. Con una sola imagen no hay miniaturas.
3. Encabezado: marca enlazada a `/marcas/{slug}`, nombre del producto y, si existe, "Fabricante: {manufacturer}".
4. Precio: "{precio} por caja" con el precio de la variante elegida o el precio desde mientras no hay receta elegida, más una línea "{reemplazo}, {n} piezas por caja". Si la variante tiene `compare_at_cents`, se muestra tachado.
5. `RxSelector` cambia la cantidad única por un selector de cajas para cada ojo (OD y OI), de 1 a 8, con 1 por defecto.
6. "Mismo valor en ambos ojos" sigue copiando la receta, no las cajas.
7. Subtotal visible: (cajas OD × precio OD) + (cajas OI × precio OI), con `formatMxn`.
8. El botón agrega dos líneas al carrito, una por ojo, cada una con su cantidad.
9. Sección "Detalles del lente" (`dl`): tipo de lente, reemplazo, piezas por caja, material, contenido de agua, bloqueo UV, tinte de visibilidad, nota de empaque, marca y fabricante. Las filas con valor `null` no se muestran.
10. Sección "Acerca de {producto}" con la descripción; sin descripción no se muestra.
11. Enlace "Ver todos los lentes de {marca}" a `/marcas/{slug}`.
12. El evento `add_to_cart` registra las cajas de cada ojo (`boxes_od`, `boxes_os`).
13. Textos en `messages/es-MX.json`; valores ópticos con `.optic`.

## Interfaces & contracts

- Consume `ProductDetail` de `GET /v1/products/{slug}` con los campos de SPEC 12.
- `POST /v1/cart/items` sin cambios: una llamada por ojo con su `quantity`.
- Evento PostHog `add_to_cart`: cambia `boxes_per_eye` por `boxes_od` y `boxes_os` (en `lib/analytics.ts`).

## Edge cases

- Variante de un ojo agotada o inexistente: ese ojo muestra el aviso actual y el botón queda desactivado.
- Cajas por encima del disponible (`available`) en variantes sin `on_demand`: aviso `rx.selector.notEnoughStock` y no se agrega.
- Falla al agregar el segundo ojo después de agregar el primero: se avisa y el carrito conserva la primera línea; el cliente puede reintentar.
- Producto sin imágenes: recuadro "Sin imagen", como hoy.
- Producto sin ningún atributo de SPEC 12: la sección de detalles muestra solo tipo, reemplazo y piezas por caja.
- Producto agotado (`from_price_cents` nulo): "Agotado" en lugar de precio y el selector desactivado.

## Acceptance criteria

- [ ] Dada una ficha con 3 imágenes, al elegir la segunda miniatura cambia la imagen principal.
- [ ] Veo migas de pan, la marca enlazada y "Fabricante: …" cuando existe.
- [ ] El precio dice "{precio} por caja" y la línea de reemplazo y piezas.
- [ ] Dado OD con 2 cajas y OI con 1, el subtotal es 2 × precio OD + 1 × precio OI y el carrito recibe dos líneas con esas cantidades.
- [ ] "Mismo valor en ambos ojos" copia la receta pero no las cajas.
- [ ] "Detalles del lente" oculta los atributos `null`.
- [ ] Dado un fallo al agregar el segundo ojo, veo el aviso y el primer ojo queda en el carrito.
- [ ] Ningún texto nuevo está fuera de `messages/es-MX.json`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan, y la ficha sigue siendo ISR.

## Risks

- Cambiar `boxes_per_eye` por dos propiedades rompe los tableros de PostHog que lo usen; hay que avisar antes de publicar.
