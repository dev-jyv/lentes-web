# SPEC 12 — Atributos ampliados de producto

> **Status:** Draft
> **Depends on:** SPEC 01, SPEC 04
> **Date:** 2026-11-11
> **Objective:** Ampliar el modelo de producto de lentes-api y su edición en lentes-admin con los datos que necesitan las fichas nuevas de lentes de contacto y armazones.

## Context

Las fichas de referencia de GlassesUSA muestran datos que hoy no existen. En lentes de contacto: fabricante, bloqueo UV, tinte de visibilidad y una descripción del empaque. En armazones: alto de mica, ancho total, peso, talla, bisagras de resorte, plaquetas ajustables, apto para progresivos y qué incluye (estuche, paño, antirrayas, garantía). Hoy `FrameDetails` solo guarda forma, material, aro, género, ancho de mica, puente y varilla, y `Product` guarda `material` y `water_content_pct` para lentes de contacto. SPEC 13 y SPEC 14 consumen estos datos; este spec solo cambia datos, contrato y admin.

## Goals

- `GET /v1/products/{slug}` devuelve los atributos nuevos de lentes de contacto y de armazones.
- lentes-admin permite capturar y editar cada atributo nuevo.
- "Qué incluye" de un armazón es configurable por producto desde lentes-admin, con al menos: estuche, paño de limpieza, capa antirrayas y garantía.
- Los productos existentes siguen funcionando sin capturar nada: todos los atributos nuevos son opcionales.

## Non-goals

- Talla como variante: la talla es un atributo del producto; si un modelo existe en dos tallas, son dos productos (decisión del usuario).
- Imágenes por color de variante.
- Reseñas y calificaciones.
- Filtrar el catálogo por los atributos nuevos (talla, peso, etc.): spec futuro.
- Probador virtual.
- Importación masiva de los atributos nuevos por CSV.

## Dependencies

- SPEC 01: tabla `shop.frame_details` y enums de armazón.
- SPEC 04: `lens_packages` (`vision_type = progressive`) para saber si se ofrece progresivo.
- Repos: `lentes-api` (migración, handlers, `api/openapi.yaml`), `lentes-admin` (formulario de producto) y `lentes-web` (`pnpm api:sync`).

## Functional requirements

1. Migración `0014_product_attributes.sql` en lentes-api, reversible.
2. Lentes de contacto, columnas nuevas en `shop.products` (nulas en armazones, validado por `CHECK`):
   - `manufacturer text null` (por ejemplo, "Johnson & Johnson").
   - `uv_blocking boolean null`.
   - `visibility_tint boolean null`.
   - `package_note text null`, máximo 160 caracteres (por ejemplo, "6 lentes en solución salina").
3. Armazones, columnas nuevas en `shop.frame_details`:
   - `lens_height_mm smallint null` (20–60).
   - `frame_width_mm smallint null` (100–160).
   - `weight_g smallint null` (5–80).
   - `size shop.frame_size null`, enum nuevo `small | medium | large`.
   - `spring_hinges boolean null`.
   - `adjustable_nose_pads boolean null`.
   - `progressive_eligible boolean null`.
   - `includes shop.frame_include[] not null default '{}'`, enum nuevo `case | cleaning_cloth | scratch_resistant | warranty`.
4. `warranty_months smallint null` (1–60) en `shop.frame_details`; solo se muestra si `includes` contiene `warranty`.
5. `GET /v1/products/{slug}` y `GET /v1/products` exponen los campos nuevos (ver Interfaces).
6. Los endpoints de admin de producto (`adminCreateProduct`, `adminUpdateProduct`) aceptan y validan los campos nuevos; un valor fuera de rango responde `400` con `detail` en español.
7. lentes-admin agrega al formulario de producto: campos de lentes de contacto (fabricante, UV, tinte, nota de empaque) y de armazón (alto, ancho total, peso, talla, bisagras, plaquetas, apto progresivos, casillas de "Qué incluye" y meses de garantía).
8. Agregar una opción nueva a "Qué incluye" requiere una migración que agregue el valor al enum, su etiqueta en lentes-admin y su texto en `messages/es-MX.json` de lentes-web.
9. lentes-web sincroniza el contrato con `pnpm api:sync`; no cambia vistas (eso es SPEC 13 y 14).

## Interfaces & contracts

OpenAPI (`lentes-api/api/openapi.yaml`):
- `Product` agrega, todos opcionales y `nullable`:
  - `manufacturer: string`
  - `uv_blocking: boolean`
  - `visibility_tint: boolean`
  - `package_note: string` (máx. 160)
- `FrameDetails` agrega:
  - `lens_height_mm: integer` (20–60, nullable)
  - `frame_width_mm: integer` (100–160, nullable)
  - `weight_g: integer` (5–80, nullable)
  - `size: FrameSize` (nullable), `FrameSize: enum [small, medium, large]`
  - `spring_hinges: boolean` (nullable)
  - `adjustable_nose_pads: boolean` (nullable)
  - `progressive_eligible: boolean` (nullable)
  - `includes: FrameInclude[]` (requerido, puede ser vacío), `FrameInclude: enum [case, cleaning_cloth, scratch_resistant, warranty]`
  - `warranty_months: integer` (1–60, nullable)
- Los esquemas de admin (`AdminProduct` y sus cuerpos de creación y edición) reciben los mismos campos.

## Edge cases

- Producto existente sin datos nuevos: todos los campos son `null` e `includes` es `[]`; la API responde igual que antes más esos campos.
- Atributo de lente enviado para un armazón (o al revés): `400`.
- `includes` con valores repetidos: se guardan sin duplicados.
- `warranty` en `includes` sin `warranty_months`: válido; la ficha dice "Garantía" sin plazo.
- `warranty_months` sin `warranty` en `includes`: `400`.
- Valor fuera de rango (peso 0, alto 200): `400` con `detail` que nombra el campo.
- Bajar la migración: se eliminan columnas y enums nuevos sin tocar datos previos.

## Acceptance criteria

- [ ] Dada la migración aplicada, `GET /v1/products/{slug}` de un armazón existente devuelve los campos nuevos en `null` e `includes: []`.
- [ ] Dado lentes-admin, puedo capturar alto, ancho total, peso, talla, bisagras, plaquetas, apto progresivos, "Qué incluye" y garantía de un armazón y verlos en la API.
- [ ] Dado lentes-admin, puedo capturar fabricante, UV, tinte y nota de empaque de un lente de contacto y verlos en la API.
- [ ] Dado un peso de 0 g, la API responde `400` con un `detail` en español.
- [ ] Dado `warranty_months` sin `warranty` en `includes`, la API responde `400`.
- [ ] La migración baja y vuelve a subir sin errores.
- [ ] `lentes-web/openapi/openapi.yaml` y el cliente generado incluyen los campos nuevos tras `pnpm api:sync`, y `pnpm typecheck` pasa.

## Risks

- Toca tres repos; el orden de despliegue debe ser lentes-api, luego lentes-admin y lentes-web, para que nadie lea campos que la API aún no envía.
- Mostrar "Garantía" o "Antirrayas" obliga a que el negocio los cumpla; la responsabilidad pasa a quien captura en lentes-admin.

## Open questions

- ¿"Apto para progresivos" se captura a mano o se deriva del alto de mica (por ejemplo, ≥ 28 mm)? Este borrador lo captura a mano.
- ¿Qué otras opciones de "Qué incluye" se necesitan además de estuche, paño, antirrayas y garantía?
