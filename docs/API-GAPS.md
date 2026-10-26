# lentes-web ↔ lentes-api: contrato y huecos

`openapi/openapi.yaml` es una **copia** de `lentes-api/api/openapi.yaml` (fuente de verdad); `pnpm api:sync` la actualiza y regenera `lib/api/generated`.
Verificado en local contra la API real (Postgres + seed): catálogo, detalle, variante, carrito anónimo (agregar, cambiar cantidad, quitar).

## Lo que la web necesita y la API aún no tiene

Mientras tanto vive en `openapi/provisional/web-ops.yaml` (genera `lib/api/provisional`) y se desvía al mock (`pnpm mock`, `:8081`)
con `NEXT_PUBLIC_PROVISIONAL_API_URL`. En producción esa variable va vacía.

| Hueco | Qué pide la web | Impacto hoy |
|---|---|---|
| `requires_prescription` en el carrito | `CartItem.product.requires_prescription` | El checkout asume que sí requiere (lo normal en lentes de contacto) |
| Checkout | `POST /v1/checkout` → `{ order_id, init_point }` (409 si cambió precio o stock) | Provisional / mock |
| Pedido del cliente | `GET /v1/me/orders/{id}` con renglones (para `/checkout/resultado` y `/recompra`) | Provisional / mock |
| Recompra | `POST /v1/me/orders/{id}/reorder` → `{ added, unavailable[] }` (agrega al carrito del cliente) | Provisional / mock |
| Recetas | `POST /v1/me/prescriptions/upload-url`, `GET/POST /v1/me/prescriptions` | Provisional / mock |

## Resuelto en la API

- **Precio e imagen en el catálogo** (`lentes-api` e9244b9): `Product.from_price_cents` (mínimo entre variantes activas con `stock - reserved > 0`; `null` = agotado)
  e `image_url` (imagen de menor posición; `null` si no hay). La web muestra "Desde $X" o "Agotado", y declara `offers` en el JSON-LD solo si hay precio.
- **URLs de imagen:** la API las arma con `R2_PUBLIC_BASE_URL`. Si esa variable está vacía (desarrollo) devuelve rutas relativas; la web las completa con
  `NEXT_PUBLIC_IMG_URL` y, si no está definida, no muestra la imagen. En producción `R2_PUBLIC_BASE_URL` debe estar definida.

## Decisiones de la reconciliación

- **Un renglón por ojo.** La web siempre agrega `right` y `left` por separado (mismo `variant_id` si la graduación es igual). El valor `both` existe en el contrato
  pero su semántica de cantidad y cobro no está documentada, así que no se usa. La UI sí lo muestra si llegara.
- **Token de carrito en el cuerpo.** La API lo devuelve como `cart_token` (solo al crear el carrito anónimo); el mutator lo guarda en la cookie `cart_token`
  y lo envía en `X-Cart-Token`. Ya no se lee de un header de respuesta.
- **`201` al agregar al carrito**, `409` sin existencias: la web muestra el mensaje y vuelve a consultar el carrito (nunca confía en una respuesta de error como carrito).
- **`purchasable`/`available`** por renglón: si algún renglón no es comprable se deshabilita "Continuar al pago" y se explica por qué.
- **Prefijo `/v1`.** Las rutas generadas ya lo incluyen; `NEXT_PUBLIC_API_URL` conserva `/v1` (como en el SPEC) y el mutator quita el prefijo duplicado.

## Cuando la API publique un hueco

`pnpm api:sync`, cambiar los imports de `@/lib/api/provisional/*` por `@/lib/api/generated/*` (los nombres de operación se conservaron), y borrar de
`openapi/provisional/web-ops.yaml` lo ya publicado. Al terminar con todo: borrar `scripts/mock-api.mjs`, `lib/api/provisional` y el desvío en `lib/api/mutator.ts`.
