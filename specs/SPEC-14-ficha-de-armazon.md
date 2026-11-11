# SPEC 14 — Ficha de armazón

> **Status:** Draft
> **Depends on:** SPEC 12
> **Date:** 2026-11-11
> **Objective:** Rediseñar la ficha `/armazones/[slug]` con galería navegable, precio con oferta, qué incluye, medidas completas y una sección de características, siguiendo la ficha de GlassesUSA.

## Context

La ficha actual de armazón muestra la imagen principal con miniaturas fijas, insignias de forma, material, aro y género, `FrameSelector` (color y paquete de micas) y tres medidas: ancho de mica, puente y varilla. La ficha de referencia de GlassesUSA (Ottoto Annex) agrega migas de pan, precio original tachado con precio de oferta, una sección "Qué incluye", más medidas (alto de mica, ancho total, peso), talla y características (bisagras de resorte, plaquetas ajustables, apto para progresivos). SPEC 12 aporta esos datos.

## Goals

- La galería permite elegir la imagen principal desde las miniaturas.
- El precio muestra la oferta cuando la variante tiene `compare_at_cents`.
- "Qué incluye" lista lo que el producto declara en `includes`, y no aparece si está vacío.
- "Medidas" muestra hasta seis valores con un diagrama simple de dónde se mide cada uno.
- "Características" lista talla, género, material, aro, forma, color y los atributos booleanos de SPEC 12.

## Non-goals

- Probador virtual, "Encuentra tu talla" y prueba en casa.
- Selector de talla: la talla es un atributo del producto (SPEC 12).
- Imágenes por color.
- Reseñas y calificaciones.
- Financiamiento, seguros, envío o devoluciones gratis y garantía de devolución de dinero.
- Cambiar el flujo de elección de micas de SPEC 04.

## Dependencies

- SPEC 12: campos nuevos de `FrameDetails` (`lens_height_mm`, `frame_width_mm`, `weight_g`, `size`, `spring_hinges`, `adjustable_nose_pads`, `progressive_eligible`, `includes`, `warranty_months`).
- Código existente: `FrameSelector`, `getProduct`, `imageSrc`, etiquetas de `lib/format.ts`.

## Functional requirements

1. Migas de pan: Inicio › Armazones › {marca} › {producto}, con `BreadcrumbList` en JSON-LD.
2. Galería: la imagen principal cambia al elegir una miniatura; las miniaturas son botones con `aria-pressed`.
3. Encabezado: marca enlazada a `/marcas/{slug}`, nombre del producto y, si existe, la talla ("Talla grande").
4. Precio en `FrameSelector`: con `compare_at_cents` mayor al precio, se muestra el original tachado, el precio actual y una insignia "Oferta". Sin él, solo el precio.
5. Sección "Qué incluye" con un icono y texto por cada valor de `includes`: estuche, paño de limpieza, capa antirrayas y garantía ("Garantía de {n} meses" si hay `warranty_months`, si no "Garantía").
6. Sección "Medidas": ancho de mica, puente, varilla, alto de mica, ancho total y peso; las que son `null` no se muestran. Valores con `.optic` y unidad (mm, g).
7. Un diagrama SVG en línea marca ancho de mica, puente, varilla y alto de mica; las etiquetas salen de `messages/es-MX.json`.
8. Sección "Características" (`dl`): talla, género, material, aro, forma, color seleccionado, bisagras de resorte, plaquetas ajustables y apto para progresivos ("Sí"/"No"); las filas `null` no se muestran.
9. Si `progressive_eligible` es `false`, `FrameSelector` no ofrece paquetes de micas con `vision_type = progressive`.
10. Sección "Acerca de {producto}" con la descripción; sin descripción no se muestra.
11. Textos en `messages/es-MX.json`.

## Interfaces & contracts

- Consume `ProductDetail` de `GET /v1/products/{slug}` con los campos de SPEC 12.
- Mensajes nuevos bajo `frames.*` (incluye, medidas, características) y `labels.frameSize`, `labels.frameInclude`.
- Sin cambios de API más allá de SPEC 12.

## Edge cases

- Armazón sin ningún atributo de SPEC 12: se muestran las tres medidas actuales y las características base (género, material, aro, forma, color); "Qué incluye" no aparece.
- `compare_at_cents` menor o igual al precio: no hay oferta.
- Color seleccionado agotado: el precio y la oferta son los de esa variante, como hoy.
- `progressive_eligible` en `null`: se ofrecen todos los paquetes, como hoy.
- Una sola imagen: sin miniaturas.
- Valor de `includes` desconocido (agregado en la API antes que en lentes-web): se omite sin romper la página.

## Acceptance criteria

- [ ] Al elegir una miniatura, cambia la imagen principal y la miniatura queda marcada.
- [ ] Dada una variante con `compare_at_cents` de $1,499 y precio de $999, veo $1,499 tachado, $999 y la insignia "Oferta".
- [ ] Dado `includes: [case, warranty]` y `warranty_months: 12`, veo "Estuche" y "Garantía de 12 meses".
- [ ] Dado `includes: []`, no aparece "Qué incluye".
- [ ] "Medidas" muestra solo las medidas no nulas, con unidad, y el diagrama.
- [ ] Dado `progressive_eligible: false`, no se ofrecen paquetes progresivos.
- [ ] Veo migas de pan y la marca enlazada.
- [ ] Ningún texto nuevo está fuera de `messages/es-MX.json`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan, y la ficha sigue siendo ISR.

## Risks

- La insignia "Oferta" depende de que `compare_at_cents` sea un precio real anterior; si se captura mal, la tienda promete un descuento falso (regla de copy de CLAUDE.md).
