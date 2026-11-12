# SPEC 17 — Configurador de micas por pasos

> **Status:** Approved
> **Depends on:** SPEC 04, SPEC 14
> **Date:** 2026-11-12
> **Objective:** Reemplazar la elección de paquete de micas de la ficha de armazón por un panel de pasos (necesidad visual, tratamiento y receta) con tratamientos administrables.

## Context

SPEC 04 vende armazón + un paquete de micas (`shop.lens_packages`, con `vision_type` `none`, `single_vision` o `progressive`) elegido en tarjetas dentro de la ficha. Dejó fuera, a propósito, un configurador por pasos de tratamiento. Hoy producción no tiene paquetes y no tiene `FRAME_LEAD_TIME_DAYS`, así que ninguna ficha vende.

El responsable quiere el flujo de Devlyn: al comprar, un panel lateral con barra de avance pide primero la necesidad visual (Solo armazón, Visión sencilla, Visión progresiva, Sin graduación), luego el tratamiento (antirreflejante, luz azul, etc., cada uno con su precio extra) y, si la necesidad lleva graduación, la receta. Un resumen con subtotal acompaña cada paso.

Se decidió construir las cuatro necesidades y el paso de receta, pero activar por ahora solo "Solo armazón" y "Sin graduación". Las otras se encienden desde el admin sin programar.

## Goals

- La ficha de armazón abre un panel de pasos en lugar de las tarjetas de paquete de SPEC 04.
- Los tratamientos se gestionan en el admin: nombre, descripción, ícono, precio extra, etiqueta, a qué necesidades aplican, orden y estado.
- Existe la necesidad "Solo armazón", sin tratamiento ni receta.
- El precio de la línea es armazón + necesidad + tratamiento, calculado y congelado en servidor.
- El pedido, el admin y los correos muestran el tratamiento elegido.

## Non-goals

- "Acude a sucursal" y examen de la vista: la tienda no tiene sucursales.
- "Enviar receta por correo" después de pagar: el checkout de SPEC 04 sigue exigiendo la receta de armazones.
- Precio de tratamiento que dependa de la graduación ("Precio en siguiente paso").
- Tinte, material o índice de mica como pasos aparte.
- Existencias de micas o de tratamientos.
- Probador virtual.
- Precargar tratamientos o sus precios: los captura el responsable.

## Dependencies

- SPEC 04: `shop.lens_packages`, carrito con `lens_package_id`, recetas `glasses`, checkout y pedido.
- SPEC 14: ficha de armazón y `FrameSelector`.
- **Operativa:** `FRAME_LEAD_TIME_DAYS=10` en Railway para encender la venta, y existencias reales de cada armazón.

## Functional requirements

### Datos

1. `shop.vision_type` agrega `frame_only`. El `CHECK` de `lens_packages` pasa a `requires_prescription = (vision_type IN ('single_vision','progressive'))`.
2. `shop.lens_packages` agrega `badge text NULL` (máx. 24 caracteres), mostrado como etiqueta en la tarjeta ("Comprar en set").
3. Una migración crea `shop.lens_treatments`: `id`, `name` (máx. 60), `slug` único, `description` (máx. 160, nullable), `icon`, `badge` (máx. 24, nullable), `price_cents >= 0`, `vision_types shop.vision_type[]` no vacío y sin `frame_only`, `position`, `active`, `created_at`, `updated_at`.
4. `icon` es un enum `shop.treatment_icon`: `anti_reflective`, `color`, `blue_light`, `premium`, `photochromic`, `polarized`.
5. Los tratamientos no se borran, solo se desactivan, porque los pedidos los citan.
6. `shop.cart_items` y `shop.order_items` agregan `lens_treatment_id uuid NULL` (FK). La llave única del carrito pasa a `(cart_id, variant_id, eye, lens_package_id, lens_treatment_id)` con `NULLS NOT DISTINCT`, sin pérdida de datos.
7. `product_snapshot` del pedido agrega `lens_treatment` (`name`, `slug`) y `treatment_price_cents`.

### Reglas del carrito

8. El precio unitario de una línea de armazón es `frame + package + treatment`, siempre desde la base.
9. Con `frame_only`, enviar `lens_treatment_id` responde `400`.
10. Con otra necesidad, si existe al menos un tratamiento activo que aplique a su `vision_type`, `lens_treatment_id` es obligatorio (`400` si falta). Si no existe ninguno, se acepta sin tratamiento.
11. Un tratamiento inactivo o que no aplica a la necesidad responde `400`.
12. `purchasable` es falso si el tratamiento de la línea se desactiva o deja de aplicar a su necesidad.
13. Una línea de lente de contacto rechaza `lens_treatment_id` con `400`.
14. La fusión de carrito respeta la nueva llave.

### API

15. `GET /v1/products/{slug}` de armazón agrega `lens_treatments`: tratamientos activos en orden, con `vision_types`. Sigue vacío si la venta está apagada.
16. Endpoints admin para tratamientos: listar, crear, editar y reordenar, con el mismo patrón que `/v1/admin/lens-packages`.
17. `LensPackageInput` y `LensPackage` agregan `badge`.
18. `CartItem`, la línea de pedido del cliente y la del admin agregan `lens_treatment` (nullable) y `treatment_price_cents` (nullable).

### Tienda (`lentes-web`)

19. Con la venta encendida y paquetes activos, la ficha muestra color, precio del armazón y un botón "Elegir micas" que abre un panel lateral (pantalla completa en móvil) con barra de avance, botón atrás y cerrar.
20. Paso 1, "Elige tu necesidad visual": una tarjeta por paquete activo con ícono por `vision_type`, nombre, descripción, etiqueta y precio. "Solo armazón" muestra el total; las demás muestran "desde" con armazón + paquete + el tratamiento aplicable más barato. Se ocultan las progresivas si el armazón no es apto (`progressive_eligible = false`).
21. Paso 2, "Elige tu tratamiento": se muestra si la necesidad tiene tratamientos aplicables. Cada tarjeta lleva ícono, nombre, descripción, etiqueta y "Gratis" o "+$X". "Solo armazón" y las necesidades sin tratamientos lo saltan.
22. Paso 3, "Ingresa tu receta": solo si la necesidad requiere receta. Ofrece "Subir mi receta" (con sesión, crea una receta `glasses` pendiente con el flujo actual) o "La elijo al pagar". El checkout preselecciona la receta `glasses` más reciente. Sin sesión, "Subir mi receta" lleva a iniciar sesión y regresa a la ficha.
23. Un resumen al pie del panel lista armazón con color, necesidad y tratamiento con sus precios, y el subtotal. El último paso muestra "Agregar al carrito"; al agregar se cierra el panel y abre el carrito.
24. El carrito, el checkout, el detalle del pedido y el historial muestran necesidad y tratamiento con su desglose.
25. `add_to_cart` agrega `lens_treatment` (slug), sin datos de receta. El panel de receta lleva `ph-no-capture`.

### Admin (`lentes-admin`)

26. La pantalla "Micas" tiene dos pestañas: "Necesidades visuales" (los paquetes, con `frame_only` y `badge`) y "Tratamientos" (crear, editar, ordenar y desactivar, con selector de ícono y casillas de necesidades).
27. El detalle del pedido muestra el tratamiento y su precio.

### Correos y datos iniciales

28. Los correos de confirmación muestran el tratamiento junto al paquete.
29. Tras desplegar se crean en producción, desde el admin: "Solo armazón" (`frame_only`, $0, activo), "Sin graduación" (`none`, $0, activo), "Visión sencilla" y "Visión progresiva" (inactivos, precio a capturar). No se crean tratamientos.

## Interfaces & contracts

```yaml
VisionType: { type: string, enum: [frame_only, none, single_vision, progressive] }
TreatmentIcon: { type: string, enum: [anti_reflective, color, blue_light, premium, photochromic, polarized] }

LensTreatment:
  type: object
  required: [id, name, slug, description, icon, badge, price_cents, vision_types]
  properties:
    id: { type: string, format: uuid }
    name: { type: string }
    slug: { type: string }
    description: { type: string, nullable: true }
    icon: { $ref: "#/components/schemas/TreatmentIcon" }
    badge: { type: string, nullable: true }
    price_cents: { type: integer, format: int64, minimum: 0 }
    vision_types: { type: array, minItems: 1, items: { $ref: "#/components/schemas/VisionType" } }

AdminLensTreatment: LensTreatment + { position: integer, active: boolean }
LensTreatmentInput: { name, slug, description?, icon, badge?, price_cents, vision_types, active }
```

| Esquema | Cambio |
|---|---|
| `LensPackage`, `LensPackageInput` | Agregan `badge` (string, nullable). |
| `ProductDetail` | Agrega `lens_treatments: LensTreatment[]`. |
| `CartItemInput` | Agrega `lens_treatment_id` (uuid, nullable). |
| `CartItem`, líneas de pedido | Agregan `lens_treatment` (`{ name, slug }`, nullable) y `treatment_price_cents` (nullable). |

| Ruta | Auth | Respuesta |
|---|---|---|
| `GET /v1/admin/lens-treatments` | admin | `200 { items: AdminLensTreatment[] }` |
| `POST /v1/admin/lens-treatments` | admin | `201`, `400`, `409` si el slug existe |
| `PUT /v1/admin/lens-treatments/{id}` | admin | `200`, `400`, `404` |
| `PUT /v1/admin/lens-treatments/order` | admin | `200`, `400` |

## Non-functional requirements

- Dinero en centavos `int64`; el total se calcula solo en servidor.
- Las migraciones son reversibles; el down de `frame_only` falla con mensaje claro si existen paquetes o pedidos con ese tipo.
- El panel funciona con teclado, atrapa el foco y regresa el foco al botón al cerrar.

## Edge cases

- **Mismo armazón, color y necesidad con dos tratamientos:** dos líneas.
- **Tratamiento desactivado con la línea en el carrito:** `purchasable = false`; el cliente elige de nuevo desde "Cambiar" en el carrito.
- **Se crea el primer tratamiento de una necesidad con líneas sin tratamiento en carritos:** esas líneas siguen siendo comprables.
- **Precio de tratamiento modificado con la línea en el carrito:** el carrito muestra el vigente y el pedido congela el del checkout.
- **Armazón no apto para progresivos:** la tarjeta de progresiva no aparece y la API rechaza esa combinación como hoy.
- **Variante agotada:** el botón "Elegir micas" queda deshabilitado.
- **Solo "Solo armazón" activo:** el panel muestra un solo paso con una tarjeta.
- **Sesión expirada al subir receta:** se pide iniciar sesión y se conserva la selección en el panel.

## Acceptance criteria

- [ ] Un armazón de $1,000 con "Sin graduación" ($0) y un tratamiento de $500 cuesta $1,500 en carrito, preferencia y pedido.
- [ ] "Solo armazón" con `lens_treatment_id` responde `400`; sin él, agrega la línea al precio del armazón.
- [ ] Con un tratamiento activo para `none`, agregar "Sin graduación" sin tratamiento responde `400`.
- [ ] Un tratamiento que no aplica a la necesidad o está inactivo responde `400`.
- [ ] Desactivar un tratamiento marca sus líneas como no comprables.
- [ ] El pedido conserva nombre y precio del tratamiento aunque luego cambie.
- [ ] El admin crea, edita, ordena y desactiva tratamientos y ve el tratamiento en el detalle del pedido.
- [ ] La ficha abre el panel, recorre los pasos que aplican y agrega al carrito; "Solo armazón" agrega en un paso.
- [ ] Con una necesidad con receta, el paso de receta aparece y el checkout preselecciona la receta subida.
- [ ] El flujo de lentes de contacto y las pruebas existentes de SPEC 04 pasan sin cambios.
- [ ] La venta queda encendida en producción con `FRAME_LEAD_TIME_DAYS=10`, "Solo armazón" y "Sin graduación" activos.

## Risks

- **Política de cambios:** `/cambios-y-devoluciones` cubre "Sin graduación"; "Solo armazón" y los tratamientos sobre micas sin aumento quedan en la misma regla de 30 días sin uso. Si un tratamiento se fabrica a medida, la política debe ajustarse antes de activarlo.
- **Encender la venta:** con `FRAME_LEAD_TIME_DAYS` definido se venden todos los armazones activos con existencia; las existencias deben ser reales.
- **Cambio en carrito y checkout:** se mitiga con las pruebas actuales con Postgres real y las nuevas de este spec.
