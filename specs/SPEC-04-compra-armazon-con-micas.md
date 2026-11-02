# SPEC 04 — Compra de armazón con micas

> **Status:** Implemented — lentes-api#2, lentes-admin#1, lentes-web#1
> **Depends on:** SPEC 01, SPEC 03
> **Date:** 2026-11-02
> **Objective:** Permitir que un cliente compre un armazón con un paquete de micas y su receta de armazones.

## Context

SPEC 01 y SPEC 03 permiten mostrar armazones, no venderlos. Hoy el carrito es de una variante por ojo, las existencias corresponden a cajas, y una receta se aplica a todo el pedido sin distinguir su tipo. Una receta de armazones y una de lentes de contacto no son intercambiables: esta última incluye datos de adaptación como curva base y diámetro. Se decidió vender armazón + micas, como hacen las referencias, con paquetes simples en lugar de un configurador por pasos.

## Goals

- El cliente elige color, un paquete de micas y agrega el conjunto al carrito.
- El precio se calcula en servidor como armazón + paquete y queda congelado en el pedido.
- Se exige una receta del tipo correcto para cada producto del carrito.
- Un carrito puede mezclar armazones y lentes de contacto.
- El admin gestiona paquetes y ve en el pedido todo lo necesario para mandarlo a laboratorio.

## Non-goals

- Configurador por pasos de material, tratamiento y tinte.
- Existencias de micas: cada mica se fabrica por pedido.
- Integración con un sistema de laboratorio: el pase es manual.
- Lentes de sol graduados.
- Probador virtual, prueba en casa y medición de distancia pupilar por cámara.
- Devoluciones, cambios y garantías automatizadas.
- Recordatorio de recompra para armazones.

## Dependencies

- SPEC 01: categoría, variantes por color y bloqueo de carrito que aquí se retira.
- SPEC 03: `/armazones/[slug]`.
- **Operativa, requisito para activar y no para programar:** un laboratorio que fabrique las micas y su tiempo de entrega en `FRAME_LEAD_TIME_DAYS`.
- **Legal, requisito para activar y no para programar:** la validación pendiente con abogado de `lentes-api/docs/PRESCRIPTIONS.md` también aplica a armazones, junto con la política de cambios y devoluciones.

## Functional requirements

### Paquetes de micas

1. Una migración crea `shop.lens_packages`: `id`, `name`, `slug`, `description`, `vision_type`, `requires_prescription`, `price_cents`, `position`, `active`.
2. `vision_type` es `none` (sin graduación), `single_vision` o `progressive`.
3. `none` implica `requires_prescription = false`; los demás implican `true`. Un `CHECK` lo garantiza.
4. `price_cents` admite 0 (`>= 0`).
5. `lentes-admin` tiene una pantalla "Micas" para crear, editar, ordenar y desactivar paquetes. No se borran: solo se desactivan, porque hay pedidos que los citan. Los paquetes iniciales son: Sin graduación, Monofocal básica, Monofocal con antirreflejante y filtro de luz azul, y Progresiva. Sus precios se capturan en el admin y no van en el seed de producción.

### Recetas

6. `shop.prescriptions` agrega `kind` (`contact_lens` o `glasses`), `NOT NULL DEFAULT 'contact_lens'`, y `pd_mm numeric(4,1)` nullable. Las recetas actuales quedan como `contact_lens`.
7. `POST /v1/me/prescriptions` acepta `kind` y `pd_mm`. `glasses` valida `pd_mm` entre 40.0 y 80.0 si viene. En el formulario del cliente es opcional.
8. El formulario de receta de la cuenta permite elegir el tipo. Las recetas se muestran con su tipo en cuenta y admin.
8a. `PATCH /v1/admin/prescriptions/{id}` acepta `pd_mm`, para que el admin capture el valor que obtenga del cliente.

### Carrito

9. `shop.cart_items` agrega `lens_package_id` nullable (FK a `lens_packages`).
10. El índice único pasa a ser `(cart_id, variant_id, eye, lens_package_id)` con `NULLS NOT DISTINCT`, en una migración sin pérdida de datos.
11. Una línea de armazón usa `eye = 'both'` y exige un `lens_package_id` activo. Una línea de lente de contacto rechaza `lens_package_id`, con `400`.
12. El precio unitario de la línea es `frame.price_cents + package.price_cents`, siempre desde la base.
13. La venta de armazones depende de `FRAME_LEAD_TIME_DAYS`. Sin esa variable, se conserva el `409` de SPEC 01 para variantes de armazón. Con ella definida (entero mayor a 0), se retira ese `409`.
14. `purchasable` es falso si el armazón, su variante o el paquete dejan de estar activos.
15. `GET /v1/products/{slug}` en armazones incluye `lens_packages` activos y `frame_lead_time_days`. Sin `FRAME_LEAD_TIME_DAYS`, devuelve `lens_packages` vacío y `frame_lead_time_days: null`.
16. La fusión de carrito anónimo (`POST /v1/cart/merge`) respeta la nueva llave de línea.

### Checkout y pedido

17. `CheckoutInput` agrega `glasses_prescription_id`. `prescription_id` sigue siendo para lentes de contacto.
18. Con lentes de contacto que requieren receta se exige `prescription_id` de tipo `contact_lens`. Con un paquete que requiere receta se exige `glasses_prescription_id` de tipo `glasses`.
19. Un tipo equivocado responde `409` con `detail` en español. Las demás reglas no cambian: propia, no rechazada y no vencida; `pending` se acepta.
20. `shop.orders` agrega `glasses_prescription_id`. `shop.order_items` agrega `lens_package_id` y `product_snapshot` incluye categoría, color, paquete y precios desglosados de armazón y micas.
21. Solo se aparta y descuenta la existencia de la variante del armazón.
22. La preferencia de Mercado Pago usa el total ya calculado y un título con armazón, color y paquete.
23. `estimated_run_out_at` ignora las líneas de armazón. Un pedido solo de armazones lo deja en `null` y no genera recordatorio.
24. `POST /v1/me/orders/{id}/reorder` no agrega líneas de armazón, y las reporta en `unavailable` con `reason: not_reorderable`.
25. Los reportes de ventas incluyen las líneas de armazón sin fallar; su desglose por categoría queda fuera.

### Tienda

26. Si `frame_lead_time_days` no es `null` y hay paquetes activos, la ficha de armazón reemplaza el aviso de SPEC 03 por: selector de color, paquetes de micas como tarjetas con su precio, total y "Agregar al carrito". Si no, conserva el aviso.
27. El carrito muestra armazón, color, paquete, desglose y un enlace para cambiar la selección en la ficha.
28. El checkout muestra uno o dos selectores de receta según el carrito, cada uno limitado a su tipo, con opción de subir una nueva.
29. El detalle del pedido y el historial muestran armazón, color y paquete. En esas líneas no se muestra "Volver a pedir".
30. Se registran en PostHog `add_to_cart` con `category` y `lens_package`, sin datos de receta.
30a. Una página pública `/cambios-y-devoluciones` publica la política, enlazada desde el pie de página, la ficha de armazón y el checkout. Armazón con paquete `none`: cambio dentro de 30 días si no se usó. Micas a medida: sin devolución, salvo defecto de fabricación o error de la tienda.

### Admin y correos

31. El detalle del pedido del admin muestra color, paquete, `vision_type`, ambas recetas con enlace al archivo, y `pd_mm`.
31a. Un pedido con un paquete que requiere receta no puede pasar a `preparing` si su `glasses_prescription_id` no está `approved` o su `pd_mm` está vacío. La API responde `409` con el motivo en español, y el admin muestra qué falta. `preparing` significa "listo para mandar a laboratorio".
31b. Si se rechaza la receta de armazones de un pedido pagado, el admin muestra el aviso "Requiere reembolso manual". El reembolso sigue fuera de la API, como indica `lentes-api/docs/CHECKOUT.md`.
32. Los correos de confirmación muestran esas líneas sin campos ópticos vacíos.
33. El correo y el checkout muestran el tiempo estimado de entrega de armazones, tomado de una variable de configuración.

## Interfaces & contracts

```yaml
VisionType: { type: string, enum: [none, single_vision, progressive] }
PrescriptionKind: { type: string, enum: [contact_lens, glasses] }

LensPackage:
  type: object
  required: [id, name, slug, vision_type, requires_prescription, price_cents]
  properties:
    id: { type: string, format: uuid }
    name: { type: string }
    slug: { type: string }
    description: { type: string, nullable: true }
    vision_type: { $ref: "#/components/schemas/VisionType" }
    requires_prescription: { type: boolean }
    price_cents: { type: integer, format: int64, minimum: 0 }
```

| Esquema | Cambio |
|---|---|
| `CartItemInput` | Agrega `lens_package_id` (uuid, nullable). |
| `CartItem` | Agrega `category`, `color`, `lens_package` (nullable), `frame_price_cents` y `package_price_cents` (nullable). |
| `ProductDetail` | Agrega `lens_packages` (arreglo; vacío en lentes de contacto o con la venta desactivada) y `frame_lead_time_days` (entero, nullable). |
| `CheckoutInput` | Agrega `glasses_prescription_id` (uuid, nullable). |
| `Prescription`, `PrescriptionInput` | Agregan `kind` y `pd_mm`. |
| Línea de pedido cliente y admin | Agrega `category`, `color` y `lens_package_name`. |
| Reorden `unavailable[].reason` | Agrega `not_reorderable`. |

| Ruta | Auth | Respuesta |
|---|---|---|
| `GET /v1/admin/lens-packages` | admin | `200 { items: AdminLensPackage[] }` |
| `POST /v1/admin/lens-packages` | admin | `201`, `400`, `409` si el slug existe |
| `PUT /v1/admin/lens-packages/{id}` | admin | `200`, `400`, `404` |
| `PUT /v1/admin/lens-packages/order` | admin | `200`, `400` |

Variable de entorno nueva de la API: `FRAME_LEAD_TIME_DAYS`. Es opcional, y funciona como interruptor de la venta de armazones.

## Non-functional requirements

- Dinero en centavos `int64`; el total se calcula solo en servidor.
- La receta y `pd_mm` son datos de salud: no se envían a PostHog ni a los logs.
- La migración de `prescriptions` y del índice de carrito es reversible, y no bloquea escrituras de forma prolongada en el volumen actual.
- Reservar armazones usa el `UPDATE` atómico existente, con la prueba de concurrencia actual extendida a armazones.

## Edge cases

- **Mismo armazón y color con dos paquetes distintos:** son dos líneas.
- **Mismo armazón, color y paquete:** suma cantidad en la línea, con el tope existente de 12.
- **Paquete desactivado con la línea en el carrito:** `purchasable = false`, y el cliente debe elegir otro.
- **Precio de paquete modificado con la línea en el carrito:** el carrito muestra el precio vigente, y el pedido congela el precio al hacer checkout.
- **Carrito mixto:** se exigen ambas recetas, cada una de su tipo.
- **Paquete `none`:** no exige receta; un carrito solo con esa opción no muestra selector.
- **Receta de contacto en `glasses_prescription_id` o viceversa:** `409`.
- **Receta `glasses` sin `pd_mm`:** se acepta al comprar. El admin la solicita al cliente y la captura, y el pedido no pasa a `preparing` sin ella.
- **Receta `glasses` pendiente al cobrar:** se acepta. El pedido no pasa a `preparing` hasta aprobarla.
- **Receta `glasses` rechazada después del pago:** el pedido no avanza, y el admin ve el aviso de reembolso manual.
- **Pago tardío sin existencias:** se comporta igual que hoy (`payment:late_unfulfillable`).
- **Recompra de un pedido mixto:** agrega lentes de contacto y reporta el armazón como `not_reorderable`.
- **Fusión con líneas idénticas:** se suman y respetan el tope de 12.

## Acceptance criteria

- [ ] Sin `FRAME_LEAD_TIME_DAYS`, la ficha muestra el aviso y `POST /v1/cart/items` con un armazón responde `409`.
- [ ] `/cambios-y-devoluciones` publica la política y está enlazada desde el pie de página, la ficha y el checkout.
- [ ] Un armazón de $1,000 con un paquete de $500 aparece a $1,500 en carrito, preferencia y pedido.
- [ ] Un precio enviado por el cliente nunca altera el total.
- [ ] Un carrito mixto sin una de las recetas responde `409`, y con ambas crea el pedido.
- [ ] Una receta del tipo equivocado responde `409`, y una ajena responde `404`.
- [ ] Un paquete `none` completa el checkout sin receta.
- [ ] Un pedido con receta `glasses` pendiente se puede pagar, y pasarlo a `preparing` responde `409`.
- [ ] Un pedido con receta `glasses` aprobada sin `pd_mm` responde `409` al pasar a `preparing`, y avanza tras capturar `pd_mm`.
- [ ] Un pedido pagado con receta `glasses` rechazada muestra el aviso de reembolso manual en el admin.
- [ ] Con 8 compradores y 1 armazón disponible, solo 1 reserva tiene éxito.
- [ ] Solo la variante del armazón cambia de existencias tras el pago.
- [ ] Cambiar el precio de un paquete después de pagar no altera el pedido.
- [ ] Un pedido solo de armazones deja `estimated_run_out_at` en `null`, sin recordatorio.
- [ ] La recompra de un pedido mixto reporta `not_reorderable` y agrega solo los lentes de contacto.
- [ ] Las recetas existentes quedan como `contact_lens`, y el flujo actual de lentes de contacto pasa sus pruebas sin cambios.
- [ ] En el admin se gestiona un paquete, y el detalle del pedido permite preparar el trabajo de laboratorio.
- [ ] El correo de confirmación de un pedido mixto se muestra sin campos vacíos.
- [ ] No hay datos de receta en eventos de PostHog ni en logs.
- [ ] La compra completa funciona en navegador con Mercado Pago en sandbox, o se reporta como no verificada si faltan credenciales.

## Risks

- **Regulación:** se decidió aceptar la receta `pending` al cobrar, pero eso sigue sin validar por un abogado. Es un riesgo que se amplía con este producto y debe resolverse antes de vender.
- **Reembolso manual:** rechazar una receta después del pago depende de que alguien reembolse en Mercado Pago. Mientras no exista automatización, puede retrasarse u olvidarse.
- **Fabricación:** una mica graduada es a medida; un pedido cancelado después de pasar a laboratorio puede ser pérdida. La política de cancelación y cambios debe existir antes del lanzamiento.
- **Ajuste y centrado:** comprar sin probarse el armazón eleva las devoluciones. Las medidas de SPEC 01 lo reducen, pero no lo eliminan.
- **Cambio en el flujo más sensible:** se toca carrito, checkout y webhook. Se mitiga con los tests actuales con Postgres real y los nuevos de este spec.
