# lentes-web ↔ lentes-api: contrato y huecos

`openapi/openapi.yaml` es una **copia** de `lentes-api/api/openapi.yaml` (fuente de verdad); `pnpm api:sync` la actualiza y regenera `lib/api/generated`.
Verificado en local contra la API real (Postgres + seed): catálogo, detalle, variante, carrito anónimo (agregar, cambiar cantidad, quitar).

## Estado: sin huecos

Todo lo que la tienda usa ya está en el contrato real; **no queda ningún contrato provisional ni mock** (se retiraron `openapi/provisional`, `lib/api/provisional`,
`scripts/mock-api.mjs`, el desvío del mutator y `NEXT_PUBLIC_PROVISIONAL_API_URL`). Si falta algo nuevo, se pide en `lentes-api/api/openapi.yaml` y se sincroniza.

## Lo que la API fue resolviendo

- **Precio e imagen en el catálogo** (`lentes-api` e9244b9): `Product.from_price_cents` (mínimo entre variantes activas con `stock - reserved > 0`; `null` = agotado)
  e `image_url` (imagen de menor posición; `null` si no hay). La web muestra "Desde $X" o "Agotado", y declara `offers` en el JSON-LD solo si hay precio.
- **URLs de imagen:** la API las arma con `R2_PUBLIC_BASE_URL`. Si esa variable está vacía (desarrollo) devuelve rutas relativas; la web las completa con
  `NEXT_PUBLIC_IMG_URL` y, si no está definida, no muestra la imagen. En producción `R2_PUBLIC_BASE_URL` debe estar definida.

- **Checkout, pedidos y webhook** (`lentes-api` 8e8551f, fase B5): `POST /v1/checkout` → `201 { order_id, number, total_cents, init_point }`
  (`409` carrito vacío / sin existencias / receta, `403` Turnstile, `404` dirección o receta ajena, `502` Mercado Pago, `503` sin pagos configurados),
  `GET /v1/me/orders/{id}` con renglones, y `CartItem.product.requires_prescription`. Reglas y decisiones pendientes: `lentes-api/docs/CHECKOUT.md`.
  La web usa el `detail` en español de los `409` para explicar el motivo al cliente.
  **No verificado de punta a punta**: faltan Supabase (sesión) y credenciales de Mercado Pago; la API está probada con Postgres real y Mercado Pago falso.

- **Recetas** (`lentes-api` 49b1752, fase B6): `POST /v1/me/prescriptions/upload-url` (R2, 10 min, máx. 10 MB, tamaño y tipo firmados),
  `POST/GET /v1/me/prescriptions` y la revisión del admin. La respuesta **no** trae `r2_key`; trae `file_url` (lectura prefirmada de 10 min) y `reject_reason`
  (la web lo muestra al cliente). Los `400`/`409` traen un `detail` en español que el formulario muestra tal cual. Reglas: `lentes-api/docs/PRESCRIPTIONS.md`.
  **Sin verificar de punta a punta:** falta un bucket R2 real (la firma y las reglas están probadas con Postgres y un almacén falso). Necesita CORS en R2
  que permita `PUT` desde el origen de la tienda con la cabecera `Content-Type`.

## Decisiones de la reconciliación

- **Un renglón por ojo.** La web siempre agrega `right` y `left` por separado (mismo `variant_id` si la graduación es igual). El valor `both` existe en el contrato
  pero su semántica de cantidad y cobro no está documentada, así que no se usa. La UI sí lo muestra si llegara.
- **Token de carrito en el cuerpo.** La API lo devuelve como `cart_token` (solo al crear el carrito anónimo); el mutator lo guarda en la cookie `cart_token`
  y lo envía en `X-Cart-Token`. Ya no se lee de un header de respuesta.
- **`201` al agregar al carrito**, `409` sin existencias: la web muestra el mensaje y vuelve a consultar el carrito (nunca confía en una respuesta de error como carrito).
- **`purchasable`/`available`** por renglón: si algún renglón no es comprable se deshabilita "Continuar al pago" y se explica por qué.
- **Prefijo `/v1`.** Las rutas generadas ya lo incluyen; `NEXT_PUBLIC_API_URL` conserva `/v1` (como en el SPEC) y el mutator quita el prefijo duplicado.

- **Recompra** (`lentes-api` 91673c7): `POST /v1/me/orders/{id}/reorder` → `{ added, unavailable[] }`. Deja cada renglón con *al menos* la cantidad pedida (repetir no duplica),
  es todo o nada por renglón (agotado o descontinuado se avisa y no se agrega) y usa el precio vigente. Un pedido ajeno es `404`. Reglas: `lentes-api/docs/REORDER.md`.
  La web muestra los renglones no disponibles antes de ir al carrito.

## Pendiente de verificar de punta a punta

Todo el flujo está probado en la API con Postgres real y servicios externos simulados, y la web compila con el contrato real. **No** se ha ejecutado contra:
Supabase (sesión y Google), Mercado Pago real (checkout y webhook), un bucket de R2 real (recetas; requiere CORS que permita `PUT` con `Content-Type`) ni el
backend desplegado en Cloudflare Workers/Railway.
