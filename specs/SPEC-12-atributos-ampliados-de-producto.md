# SPEC 12 — Atributos ampliados de producto

> **Status:** Implemented — lentes-api#11, lentes-admin#5, lentes-web#3
> **Depends on:** SPEC 01, SPEC 04
> **Date:** 2026-11-11
> **Objective:** Ampliar el modelo de producto de lentes-api y su edición en lentes-admin con los datos que necesitan las fichas nuevas de lentes de contacto y armazones.

## Context

Las fichas de referencia de GlassesUSA muestran datos que hoy no existen. En lentes de contacto: fabricante, bloqueo UV, tinte de visibilidad y una descripción del empaque. En armazones: alto de mica, ancho total, peso, talla, bisagras de resorte, plaquetas ajustables, apto para progresivos y qué incluye. Hoy `FrameDetails` solo guarda forma, material, aro, género, ancho de mica, puente y varilla, y `Product` guarda `material` y `water_content_pct` para lentes de contacto. SPEC 13 y SPEC 14 consumen estos datos; este spec solo cambia datos, contrato y admin.

## Goals

- `GET /v1/products/{slug}` devuelve los atributos nuevos de lentes de contacto y de armazones.
- lentes-admin permite capturar y editar cada atributo nuevo.
- "Qué incluye" de un armazón es configurable por producto desde lentes-admin, con estuche, paño de limpieza, capa antirrayas, garantía, filtro de luz azul, antirreflejante y ajuste en óptica.
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
   - `includes shop.frame_include[] not null default '{}'`, enum nuevo `case | cleaning_cloth | scratch_resistant | warranty | blue_light_filter | anti_reflective | optician_fitting`.
4. `warranty_months smallint null` (1–60) en `shop.frame_details`; solo se muestra si `includes` contiene `warranty`.
5. `progressive_eligible` no se guarda: la API lo calcula como `lens_height_mm >= 28`, y es `null` si no hay alto de mica. El umbral de 28 mm es una constante de lentes-api.
6. `GET /v1/products/{slug}` y `GET /v1/products` exponen los campos nuevos (ver Interfaces).
7. Los endpoints de admin de producto (`adminCreateProduct`, `adminUpdateProduct`) aceptan y validan los campos nuevos; un valor fuera de rango responde `400` con `detail` en español.
8. lentes-admin agrega al formulario de producto: campos de lentes de contacto (fabricante, UV, tinte, nota de empaque) y de armazón (alto, ancho total, peso, talla, bisagras, plaquetas, casillas de "Qué incluye" y meses de garantía). Junto al alto de mica muestra, solo como lectura, si el armazón resulta apto para progresivos.
9. Agregar una opción nueva a "Qué incluye" requiere una migración que agregue el valor al enum, su etiqueta en lentes-admin y su texto en `messages/es-MX.json` de lentes-web.
10. lentes-web sincroniza el contrato con `pnpm api:sync`; no cambia vistas (eso es SPEC 13 y 14).

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
  - `progressive_eligible: boolean` (nullable, solo lectura, calculado: `lens_height_mm >= 28`)
  - `includes: FrameInclude[]` (requerido, puede ser vacío), `FrameInclude: enum [case, cleaning_cloth, scratch_resistant, warranty, blue_light_filter, anti_reflective, optician_fitting]`
  - `warranty_months: integer` (1–60, nullable)
- Los esquemas de admin (`AdminProduct` y sus cuerpos de creación y edición) reciben los mismos campos, salvo `progressive_eligible`, que no se acepta en la escritura.

## Edge cases

- Producto existente sin datos nuevos: todos los campos son `null` e `includes` es `[]`; la API responde igual que antes más esos campos.
- Atributo de lente enviado para un armazón (o al revés): `400`.
- `includes` con valores repetidos: se guardan sin duplicados.
- Alto de mica exactamente de 28 mm: apto para progresivos.
- `warranty` en `includes` sin `warranty_months`: válido; la ficha dice "Garantía" sin plazo.
- `warranty_months` sin `warranty` en `includes`: `400`.
- Valor fuera de rango (peso 0, alto 200): `400` con `detail` que nombra el campo.
- Bajar la migración: se eliminan columnas y enums nuevos sin tocar datos previos.

## Acceptance criteria

- [ ] Dada la migración aplicada, `GET /v1/products/{slug}` de un armazón existente devuelve los campos nuevos en `null` e `includes: []`.
- [ ] Dado lentes-admin, puedo capturar alto, ancho total, peso, talla, bisagras, plaquetas, "Qué incluye" (7 opciones) y garantía de un armazón y verlos en la API.
- [ ] Dado un armazón con alto de mica de 30 mm, la API devuelve `progressive_eligible: true`; con 25 mm, `false`; sin alto, `null`.
- [ ] Dado lentes-admin, puedo capturar fabricante, UV, tinte y nota de empaque de un lente de contacto y verlos en la API.
- [ ] Dado un peso de 0 g, la API responde `400` con un `detail` en español.
- [ ] Dado `warranty_months` sin `warranty` en `includes`, la API responde `400`.
- [ ] La migración baja y vuelve a subir sin errores.
- [ ] `lentes-web/openapi/openapi.yaml` y el cliente generado incluyen los campos nuevos tras `pnpm api:sync`, y `pnpm typecheck` pasa.

## Risks

- Toca tres repos; el orden de despliegue debe ser lentes-api, luego lentes-admin y lentes-web, para que nadie lea campos que la API aún no envía.
- Mostrar "Garantía" o "Antirrayas" obliga a que el negocio los cumpla; la responsabilidad pasa a quien captura en lentes-admin.
