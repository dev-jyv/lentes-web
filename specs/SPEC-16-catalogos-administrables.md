# SPEC 16 — Catálogos de atributos administrables

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 12
> **Date:** 2026-11-11
> **Objective:** Permitir que el admin gestione desde `lentes-admin` los valores, etiquetas, orden y visibilidad de los catálogos de atributos de producto que hoy son listas fijas en código.

## Context

Los atributos que alimentan filtros, megamenú, formularios y fichas son enums fijos de Postgres (`shop.lens_type`, `shop.replacement`, `shop.frame_shape`, `shop.frame_material`, `shop.frame_rim`, `shop.frame_gender`, `shop.frame_color`, `shop.frame_size` y `shop.frame_include`), repetidos como enums en `openapi.yaml`.

Sus etiquetas en español viven en `messages/es-MX.json` de la tienda, en `labels.*`, y en el i18n del admin. El color de cada muestra de armazón está fijo en `components/tienda/frame-selector.tsx`. Agregar una forma o un color, cambiar una etiqueta u ocultar un valor exige cambios en tres repos y una migración.

Además, los filtros del listado muestran todos los valores aunque no tengan productos. Por ejemplo, en Lentes de contacto aparecen "Cosmético", "Quincenal", "Trimestral" y "Anual" sin un solo producto, y llevan a resultados vacíos. El megamenú ya oculta esos valores (SPEC 03), pero el listado no.

Marcas y paquetes de micas ya se gestionan en el admin y quedan fuera.

## Goals

- El admin agrega valores nuevos a los catálogos descriptivos: forma, material, montura, género, color, talla y "qué incluye".
- En todos los catálogos, el admin cambia la etiqueta en español, el orden y la visibilidad de cada valor.
- Tipo de lente y reemplazo conservan sus valores fijos, porque el código depende de ellos: tórico exige cilindro y eje, multifocal exige adición. Solo su etiqueta, orden y visibilidad son administrables.
- La tienda y el admin leen etiquetas y orden de la API, no de archivos de traducción.
- Los filtros del listado muestran solo valores con al menos un producto activo, igual que el megamenú.
- Un valor en uso nunca se puede borrar: solo ocultar.

## Non-goals

- Crear tipos de lente o reemplazos nuevos, y cualquier regla óptica nueva.
- Catálogos que no son atributos de producto: estados de pedido o de receta, ojo, motivos de inventario, tipo de visión y tipo de receta.
- Marcas y paquetes de micas, que ya tienen su gestión.
- Traducciones a otros idiomas: el catálogo guarda solo la etiqueta `es-MX`.
- Atributos nuevos (por ejemplo, un catálogo "estilo" que hoy no existe).
- Cambiar el código de un valor ya creado (renombrar el slug).

## Dependencies

- SPEC 01: categorías y facetas del catálogo (`GET /v1/catalog/facets`).
- SPEC 12: atributos ampliados de armazón (`frame_size` y `frame_include`) y su validación.

## Functional requirements

### Datos

1. Una migración crea `shop.catalog_values`:
   - `catalog`: enum nuevo `shop.catalog_kind` con los 9 catálogos del contexto.
   - `code`: `text`, con patrón `^[a-z][a-z0-9_]{1,39}$`.
   - `label`: `text`, de 1 a 40 caracteres.
   - `position`: `int`.
   - `active`: `bool`; un valor inactivo está oculto.
   - `system`: `bool`; un valor de sistema no se puede borrar.
   - `swatch`: `text`, nulo; solo en `frame_color`, con un color CSS (`#rrggbb`) o un `conic-gradient(...)` de una lista cerrada.
   - `created_at` y `updated_at`.
   - Llave primaria `(catalog, code)`.
2. La migración precarga todos los valores actuales con su etiqueta de `messages/es-MX.json`, su orden actual y `active = true`. Los colores llevan el `swatch` de `frame-selector.tsx`. Los valores de `lens_type` y `replacement`, y los de `frame_include` con comportamiento propio (punto 7), se marcan `system = true`.
3. Las columnas que usan los 7 catálogos descriptivos (`frame_details.shape`, `frame_material`, `rim`, `gender` y `size`, `variants.color` y `frame_details.includes`) pasan de enum de Postgres a `text`, y `includes` a `text[]`. Los enums viejos se borran en la misma migración.
4. `products.lens_type` y `products.replacement` siguen siendo enums de Postgres. `catalog_values` solo guarda su etiqueta, orden y visibilidad.
5. Al guardar un producto o una variante, el servicio valida que cada valor exista en `catalog_values` para su catálogo, igual que hoy valida el enum. Un valor inexistente responde `400`.

### Reglas

6. En los catálogos descriptivos, el admin puede crear valores. El `code` se genera de la etiqueta (minúsculas, sin acentos, espacios a `_`) y se puede ajustar antes de guardar. Después de creado no cambia.
7. Un valor nuevo de `frame_color` exige `swatch`. Un valor nuevo de `frame_include` se muestra en la ficha solo con su etiqueta. Los valores existentes con texto o detalle propio (por ejemplo, `warranty` con los meses de garantía y `optician_fitting`) conservan ese comportamiento y se marcan `system = true`.
8. Se puede editar `label`, `position`, `active` y, en color, `swatch` de cualquier valor, incluidos los de sistema.
9. Borrar un valor solo es posible si `system = false` y ningún producto o variante lo usa. Si está en uso responde `409`, con cuántos productos lo usan en el `detail`.
10. Ocultar un valor (`active = false`):
    - Lo quita de filtros, megamenú, facetas y de las opciones del formulario del admin para asignaciones nuevas.
    - Los productos que ya lo tienen lo conservan, y su ficha sigue mostrando la etiqueta.
    - Al editar un producto con un valor oculto, el formulario muestra ese valor como "(oculto)" y permite conservarlo.
11. El orden de `position` rige filtros, columnas del megamenú, opciones de formularios y la lista de "qué incluye" en la ficha.

### API

12. `GET /v1/catalogs` es pública, se declara en `routeAccess` y responde con `Cache-Control: public, s-maxage=300`. Devuelve todos los catálogos con sus valores activos ordenados: `{ catalog: [{ code, label, swatch? }] }`.
13. `GET /v1/catalog/facets` agrega `label` a cada valor de `values[key]` y respeta el orden y la visibilidad del catálogo.
14. Exigen rol `admin`:
    - `GET /v1/admin/catalogs`, que incluye los valores ocultos y, por valor, cuántos productos lo usan.
    - `POST /v1/admin/catalogs/{catalog}/values`, que responde `400` si el catálogo es `lens_type` o `replacement`.
    - `PATCH /v1/admin/catalogs/{catalog}/values/{code}`.
    - `PUT /v1/admin/catalogs/{catalog}/order`, que recibe la lista completa de `code` y fija el orden.
    - `DELETE /v1/admin/catalogs/{catalog}/values/{code}`.

### Tienda (`lentes-web`)

15. Las etiquetas de atributos (`genderLabel`, `shapeLabel`, `frameMaterialLabel`, `colorLabel`, `lensNeedLabel`, `replacementLabel`, `frameIncludeLabel` y similares de `lib/format.ts`) se leen de `GET /v1/catalogs`. Ese catálogo se carga en servidor con revalidación de 300 s.
16. `labels.*` de `messages/es-MX.json` se conserva solo como respaldo si la API falla.
17. Los filtros del listado de armazones y de lentes muestran solo valores con `count > 0` en las facetas de toda la categoría, sin considerar los demás filtros activos (no son facetas cruzadas), más el valor seleccionado si lo hubiera. Así los filtros no cambian mientras el cliente elige. El enlace "Todos" se muestra siempre.
18. Un valor de catálogo desconocido para la tienda (creado después del despliegue) se muestra con la etiqueta que manda la API. Un color nuevo usa su `swatch`.

### Admin (`lentes-admin`)

19. Una entrada "Catálogos" en el menú lleva a `/catalogos`, con carga diferida y dentro de `adminGuard`.
20. La pantalla lista los 9 catálogos. En cada uno se ven sus valores con etiqueta, código, productos que lo usan y estado, y se pueden reordenar arrastrando o con botones de subir y bajar.
21. Desde ahí se crean valores (salvo en tipo de lente y reemplazo), se editan etiquetas, se ocultan o muestran, y se borran los no usados.
22. Los formularios de producto y variante toman sus opciones de `GET /v1/admin/catalogs` en lugar de listas fijas.

## Interfaces & contracts

- **OpenAPI:**
  - `FrameShape`, `FrameMaterial`, `FrameRim`, `FrameGender`, `FrameColor`, `FrameSize` y `FrameInclude` dejan de ser `enum` y pasan a `type: string` con `pattern: ^[a-z][a-z0-9_]{1,39}$`.
  - `LensType` y `Replacement` siguen siendo `enum`.
  - Este es un **cambio incompatible para los clientes generados**: los tipos TypeScript pasan de unión de literales a `string`. Los mapas `Record<FrameColor, …>` de la tienda y del admin deben dejar de depender de la unión.
- **Esquemas nuevos:**
  - `CatalogKind`, un enum con los 9 catálogos.
  - `CatalogValue { code, label, position, active, system, swatch?, product_count? }`.
  - `CatalogValueInput { code?, label, swatch? }`.
  - `CatalogValuePatch { label?, active?, swatch? }`.
  - `Catalogs`, un objeto `CatalogKind` a `CatalogValue[]`.
- **`CatalogFacets.values[key][]`** agrega `label: string`.
- **Errores:**
  - `400`: código inválido o repetido, catálogo de sistema, `swatch` faltante o inválido, o un valor inexistente al guardar un producto.
  - `404`: catálogo o valor inexistente.
  - `409`: borrar un valor en uso o de sistema.

  Todos con `detail` en español.
- **Flujo del contrato:** cambia primero en `lentes-api/api/openapi.yaml`, y se propaga con `pnpm api:sync` en `lentes-web` y la sincronización equivalente en `lentes-admin`.

## Non-functional requirements

- `GET /v1/catalogs` responde en menos de 50 ms p95 y pesa menos de 10 KB.
- Ni la tienda ni el admin hacen una consulta de catálogo por producto: el catálogo se carga una vez por página o por sesión de admin.
- La migración del punto 3 corre en una sola transacción y es reversible: la migración de bajada recrea los enums con los valores que existan.

## Edge cases

- **Valor nuevo sin productos:** un color nuevo sin armazones no aparece en filtros (punto 17), pero sí en el formulario del admin.
- **Ocultar un valor con productos:** desaparece de los filtros. Un enlace guardado con ese filtro (`/armazones?shape=geometric`) muestra los productos igual, pero el filtro no aparece marcado en la lista lateral. El enlace "Todos" lo quita.
- **Borrar un valor en uso:** responde `409` con "Lo usan N productos: ocúltalo en su lugar".
- **Código repetido:** el mismo `code` en el mismo catálogo responde `400`. El mismo código en catálogos distintos, como `blue` en color, sí se permite.
- **Ocultar todos los valores de un catálogo:** el filtro de ese atributo desaparece del listado y la columna del megamenú también.
- **Import de variantes por CSV con un color nuevo:** acepta el valor si existe en `frame_color` (punto 5); si no, la fila falla con "color X no existe en el catálogo".
- **Variante tórica:** `lens_type = toric` sigue exigiendo cilindro y eje aunque el admin oculte o renombre "Tórico". La etiqueta no cambia la regla.
- **API caída:** la tienda usa las etiquetas de `messages/es-MX.json`. Un valor nuevo que no está ahí se muestra con su `code` legible (`_` a espacio y mayúscula inicial), nunca vacío.
- **Pedidos históricos:** `order_items` no guarda atributos de catálogo, así que renombrar u ocultar valores no altera pedidos ya hechos.

## Acceptance criteria

- [ ] La migración convierte los 7 enums descriptivos a `text` sin perder datos, y la migración de bajada los recrea. Tiene una prueba en `internal/testdb`.
- [ ] Tras la migración, la tienda y el admin muestran exactamente las mismas etiquetas y el mismo orden que antes.
- [ ] Desde el admin se crea la forma "Hexagonal", se asigna a un armazón y aparece en el filtro de forma y en el megamenú.
- [ ] Se crea un color sin `swatch` y responde `400`; con `swatch`, el selector de color de la ficha lo muestra.
- [ ] Al renombrar "Tórico (astigmatismo)" a "Para astigmatismo", la etiqueta cambia en filtros, ficha, carrito y megamenú en 5 minutos o menos.
- [ ] Crear un valor en `lens_type` o `replacement` responde `400`.
- [ ] Borrar un valor en uso responde `409`; borrar uno sin uso y que no es de sistema lo elimina.
- [ ] En Lentes de contacto, el filtro ya no muestra "Cosmético", "Quincenal", "Trimestral" ni "Anual" mientras no haya productos con esos valores.
- [ ] Ocultar "Gato" quita la opción del filtro y del formulario de alta, y un armazón que ya la tenía la conserva al editarse.
- [ ] `GET /v1/catalogs` responde con `Cache-Control: public, s-maxage=300`, y los endpoints `/v1/admin/catalogs*` exigen rol `admin`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan en `lentes-web`, y las pruebas de `lentes-api` y `lentes-admin` pasan.

## Risks

- **Cambio de contrato incompatible:** los tres repos deben desplegarse coordinados: primero la API, que acepta lo que ya existe, y después tienda y admin. Un cliente viejo sigue funcionando con los valores existentes, pero no conoce las etiquetas de los nuevos.
- **Migración de enums a `text`:** reescribe tablas. Con el volumen actual es inmediata; con muchos productos requeriría ventana de mantenimiento.
- **Pérdida de integridad referencial:** al dejar los enums, la base ya no impide un valor inválido escrito por fuera del servicio. Se mitiga validando en el servicio (punto 5). Agregar un `CHECK` o un trigger queda como posible mejora.
- **Etiquetas inconsistentes:** el admin puede escribir etiquetas con promesas que la tienda no cumple, por ejemplo "Con envío exprés" como valor de "qué incluye". Queda como responsabilidad operativa, conforme a `docs/BRAND.md`.
