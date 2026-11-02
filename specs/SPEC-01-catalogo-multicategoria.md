# SPEC 01 — Catálogo multicategoría

> **Status:** Implemented — lentes-api#create-pr.sh: line 89: label_args[@]: unbound variable, lentes-admin#create-pr.sh: line 89: label_args[@]: unbound variable
> **Depends on:** —
> **Date:** 2026-11-02
> **Objective:** Permitir que `lentes-api` y `lentes-admin` modelen, filtren y busquen armazones junto a los lentes de contacto.

## Context

La tienda solo modela lentes de contacto: en `shop.products`, `lens_type`, `replacement` y `pieces_per_box` son `NOT NULL`, y en `shop.variants`, `base_curve` y `diameter` también. Un armazón no tiene ninguno de esos datos, así que hoy no se puede registrar sin inventar valores. El catálogo tampoco tiene categoría, búsqueda de texto ni un dato que permita construir un menú a partir de lo que realmente está a la venta. Este spec es la base de SPEC 03 y SPEC 04.

## Goals

- Un producto pertenece a exactamente una categoría: `contact_lens` o `frame`.
- Un armazón se registra con atributos propios y variantes por color, sin valores ópticos falsos.
- `GET /v1/products` filtra por categoría, atributos de armazón y precio, y busca por texto.
- La tienda puede saber qué marcas y valores de filtro tienen productos disponibles en cada categoría.
- El admin crea y edita armazones y sus variantes.
- Los lentes de contacto existentes siguen funcionando sin cambios de comportamiento.

## Non-goals

- Lentes de sol. Quedan fuera de esta versión; el enum de categoría se puede ampliar después.
- Compra de armazones, micas, carrito y checkout (SPEC 04).
- Interfaz de la tienda (SPEC 03).
- Probador virtual, quiz de armazones, reseñas y favoritos.
- Ordenar resultados por precio o popularidad: la paginación por cursor sigue usando `created_at, id`.
- Autocompletado y tolerancia a errores de escritura en la búsqueda.
- Importar armazones por CSV: `POST /v1/admin/variants/import` sigue siendo solo para lentes de contacto.

## Dependencies

Ninguna externa. La extensión de Postgres `unaccent` debe poder habilitarse en Supabase.

## Functional requirements

### Modelo de datos

1. Una migración agrega el enum `shop.product_category` (`contact_lens`, `frame`) y `shop.products.category NOT NULL DEFAULT 'contact_lens'`. Todos los productos existentes quedan como `contact_lens`.
2. `lens_type`, `replacement` y `pieces_per_box` pasan a ser nullable. Un `CHECK` exige los tres si `category = 'contact_lens'` y ninguno si `category = 'frame'`.
3. Una tabla nueva `shop.frame_details` guarda una fila por armazón: `product_id` (PK, FK con `ON DELETE CASCADE`), `shape`, `frame_material`, `rim`, `gender`, `lens_width_mm`, `bridge_mm` y `temple_mm`.
4. `base_curve` y `diameter` de `shop.variants` pasan a ser nullable. El servicio exige ambos en lentes de contacto y los rechaza en armazones, porque un `CHECK` no puede leer la categoría de otra tabla.
5. La variante de un armazón usa `color` como dato obligatorio, tomado de la lista fija de colores. Un armazón no puede tener dos variantes del mismo color.
6. Los tipos de la sección "Interfaces & contracts" se implementan como enums de Postgres.

### API pública

7. `GET /v1/products` acepta los filtros nuevos de "Interfaces & contracts". Sin `category`, devuelve todas las categorías.
8. `q` busca en nombre de producto y nombre de marca, sin distinguir mayúsculas ni acentos. Se recorta, debe tener de 2 a 80 caracteres, y `%` y `_` se tratan como texto literal.
9. Cada parámetro de filtro acepta un solo valor. Filtros de categorías distintas se combinan con `AND`, así que pueden devolver una lista vacía.
10. El filtro de precio se aplica sobre `from_price_cents`. Los productos agotados quedan fuera cuando se usa ese filtro.
11. `GET /v1/products/{slug}` agrega `category`, `frame` y `frame_variants` en armazones.
12. `GET /v1/brands` acepta `category` opcional y entonces devuelve solo marcas con al menos un producto activo de esa categoría. Sin parámetro se comporta como hoy.
13. `GET /v1/catalog/facets?category=` devuelve, por cada filtro, los valores con al menos un producto activo y su conteo.
14. `GET /v1/catalog/facets` es pública, se declara en `routeAccess` y responde con `Cache-Control: public, s-maxage=300`.
15. `GET /v1/products/{slug}/variant` responde `404` si el producto es un armazón.

### Admin

16. `POST` y `PUT` de productos aceptan `category` y `frame`. `category` no se puede cambiar después de crear el producto: el intento responde `409`.
17. El formulario de Productos del admin pide la categoría primero y muestra solo los campos de esa categoría.
18. La lista de Productos muestra y filtra por categoría.
19. La pantalla de Variantes de un armazón pide solo SKU, color, precio, precio de comparación, existencias y estado activo.
20. Importar por CSV una fila que apunte a un armazón devuelve un error por fila, sin aplicar el archivo.

### Compatibilidad interna

21. Todo el código que hoy asume valores ópticos no nulos debe tolerar su ausencia, incluidos `cart.go`, `checkout.go`, `catalog.go`, `admin_orders.go` y las plantillas de correo.
22. Hasta que exista SPEC 04, `POST /v1/cart/items` responde `409` con un `detail` en español si la variante pertenece a un armazón.

## Interfaces & contracts

La fuente de verdad es `lentes-api/api/openapi.yaml`. `lentes-web` y `lentes-admin` lo sincronizan con `pnpm api:sync`.

```yaml
ProductCategory: { type: string, enum: [contact_lens, frame] }
FrameShape: { type: string, enum: [rectangular, square, round, oval, cat_eye, aviator, browline, geometric] }
FrameMaterial: { type: string, enum: [acetate, metal, titanium, tr90, mixed] }
FrameRim: { type: string, enum: [full, semi, rimless] }
FrameGender: { type: string, enum: [women, men, unisex, kids] }
FrameColor: { type: string, enum: [black, tortoise, brown, transparent, gray, blue, green, red, pink, purple, gold, silver, multicolor] }

FrameDetails:
  type: object
  required: [shape, material, rim, gender, lens_width_mm, bridge_mm, temple_mm]
  properties:
    shape: { $ref: "#/components/schemas/FrameShape" }
    material: { $ref: "#/components/schemas/FrameMaterial" }
    rim: { $ref: "#/components/schemas/FrameRim" }
    gender: { $ref: "#/components/schemas/FrameGender" }
    lens_width_mm: { type: integer, minimum: 30, maximum: 80 }
    bridge_mm: { type: integer, minimum: 10, maximum: 30 }
    temple_mm: { type: integer, minimum: 100, maximum: 170 }

FrameVariant:
  type: object
  required: [id, sku, color, price_cents, available, in_stock]
  properties:
    id: { type: string, format: uuid }
    sku: { type: string }
    color: { $ref: "#/components/schemas/FrameColor" }
    price_cents: { type: integer, format: int64 }
    compare_at_cents: { type: integer, format: int64, nullable: true }
    available: { type: integer }
    in_stock: { type: boolean }

CatalogFacets:
  type: object
  required: [total, brands, min_price_cents, max_price_cents, values]
  properties:
    total: { type: integer }
    brands:
      type: array
      items:
        type: object
        required: [slug, name, count]
        properties:
          slug: { type: string }
          name: { type: string }
          count: { type: integer }
    min_price_cents: { type: integer, format: int64, nullable: true }
    max_price_cents: { type: integer, format: int64, nullable: true }
    values:
      description: Llaves según la categoría. frame usa shape, material, rim, gender y color. contact_lens usa lens_type y replacement.
      type: object
      additionalProperties:
        type: array
        items:
          type: object
          required: [value, count]
          properties:
            value: { type: string }
            count: { type: integer }
```

Cambios sobre esquemas existentes:

| Esquema | Cambio |
|---|---|
| `Product` | Agrega `category` (requerido) y `frame` (`FrameDetails`, nullable). `lens_type`, `replacement` y `pieces_per_box` pasan a nullable. |
| `ProductDetail` | Agrega `frame_variants` (arreglo; vacío en lentes de contacto). |
| `ProductInput` | Agrega `category` y `frame`. Los tres campos de lentes de contacto dejan de ser requeridos en el esquema y los valida el servicio. |
| `VariantInput`, `AdminVariant`, `Variant` | `base_curve` y `diameter` pasan a nullable y opcionales. |

Parámetros nuevos de `GET /v1/products`: `category`, `q`, `shape`, `frame_material`, `rim`, `gender`, `color`, `min_price_cents` y `max_price_cents`. El filtro `material` no se usa porque `Product.material` ya es texto libre de lentes de contacto.

Errores: valor de enum inválido, `q` fuera de rango o `min_price_cents > max_price_cents` responden `400` en RFC 9457. Las reglas de negocio del admin responden `400` o `409` con `detail` en español.

## Non-functional requirements

- Dinero en centavos `int64`. Nunca float.
- `GET /v1/products` responde en p95 < 300 ms con 5,000 productos, medido sin caché en local contra Postgres.
- La migración es reversible, salvo que ya existan armazones: `goose down` debe fallar con un mensaje claro en ese caso, sin borrar datos.
- `make generate` y `make sqlc` se ejecutan y su resultado se commitea, como exige CI.
- Los tests corren con Docker activo, porque sin Docker los de Postgres se saltan en silencio.

## Edge cases

- Un armazón sin `frame_details` no puede existir: producto y detalles se crean en la misma transacción.
- `q` con solo espacios o de 1 carácter responde `400`. La tienda no debe enviarlo.
- `q` con `%`, `_` o comillas se busca como texto literal.
- `shape=round&category=contact_lens` devuelve lista vacía, no error.
- Un armazón sin variantes activas tiene `from_price_cents: null` y aparece como agotado.
- Una marca con productos de ambas categorías aparece en las dos facetas con conteos independientes.
- Productos inactivos no cuentan en facetas ni en marcas por categoría.
- Pedidos y carritos previos a la migración no cambian: sus snapshots conservan sus valores ópticos.
- La respuesta queda cacheada hasta 5 min en Cloudflare, así que un cambio del admin puede tardar eso en verse.

## Acceptance criteria

- [ ] La migración aplica sobre una copia con el seed y todos los productos previos quedan como `contact_lens`.
- [ ] Un producto `frame` con `lens_type` falla por el `CHECK`, y uno `contact_lens` sin `lens_type` también.
- [ ] Crear por API un armazón con detalles y dos colores funciona, y un color repetido responde `409`.
- [ ] Crear una variante de armazón con `base_curve` responde `400`, y una de lente de contacto sin `base_curve` también.
- [ ] Cambiar la categoría de un producto existente responde `409`.
- [ ] `GET /v1/products?q=acuvue` y `?q=óptica` ignoran mayúsculas y acentos, y `?q=%25` no devuelve todo el catálogo.
- [ ] Cada filtro nuevo tiene un test con Postgres real.
- [ ] `GET /v1/catalog/facets?category=frame` omite valores sin productos activos y no cuenta inactivos.
- [ ] `auth_test.go` pasa con la ruta pública nueva declarada en `routeAccess`.
- [ ] `POST /v1/cart/items` con una variante de armazón responde `409`.
- [ ] Los tests existentes de carrito, checkout, recompra y reportes siguen pasando.
- [ ] En el admin se crea un armazón con imágenes y variantes por color, y el formulario de lentes de contacto se comporta igual que antes.
- [ ] `lentes-web` y `lentes-admin` compilan con el contrato sincronizado.

## Risks

- **Tipos nullable en el contrato:** `Product.lens_type` y otros dejan de estar garantizados. Se mitiga desplegando primero la API, después web y admin, y creando armazones solo al final.
- **Valores ópticos nulos en código existente:** un `floatPtr` o un formato como `CB %.1f` podría fallar o mostrar datos falsos. Se mitiga con el requisito 21 y un test de cada flujo con una variante de armazón.
- **Listas cerradas:** agregar una forma o un color requiere migración y contrato. Se acepta porque los filtros necesitan vocabulario controlado.
- **`unaccent` y rendimiento:** la búsqueda hace un recorrido secuencial. Es suficiente para este catálogo; si crece, se agrega un índice `pg_trgm`.
