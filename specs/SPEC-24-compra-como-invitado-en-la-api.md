# SPEC 24 — Compra como invitado en la API

> **Status:** Approved
> **Depends on:** SPEC 19
> **Date:** 2026-11-18
> **Objective:** Permitir que `lentes-api` cree y cobre un pedido a partir del carrito anónimo con datos de contacto, dirección y receta capturados en el mismo checkout, sin cuenta de Supabase.

## Context

Hoy comprar exige sesión. `POST /v1/checkout` requiere `bearerAuth`, recibe `address_id` y `prescription_id` que deben pertenecer al cliente, y `shop.orders.user_id` es `NOT NULL` con llave a `shop.customers`. El carrito anónimo ya existe (`cart_token` en cookie y `X-Cart-Token`), pero al llegar a `/checkout` el `proxy.ts` manda a login. Cada cliente nuevo tiene que registrarse y confirmar su correo antes de pagar; es el abandono que Devlyn evita con su paso "Identificación" (correo, nombre, apellidos y teléfono, sin contraseña).

Este spec cubre solo el backend y su contrato. La pantalla está en SPEC 25. Las reglas que no cambian: precios y existencias salen de la base, el apartado dura 15 minutos, el webhook de Mercado Pago no confía en el cuerpo y la receta se valida antes del cobro (`docs/CHECKOUT.md` de `lentes-api`).

## Goals

- Un visitante sin sesión puede pagar su carrito anónimo enviando contacto, dirección y, si el carrito lo pide, receta.
- El pedido de invitado sigue exactamente el mismo flujo de apartado, Mercado Pago, webhook y correos que el de un cliente.
- El invitado puede consultar el estado de su pedido con un enlace privado que recibe por correo.
- El endpoint resiste el abuso: CAPTCHA obligatorio y límite por IP, porque cada intento aparta inventario.

## Non-goals

- Crear una cuenta de Supabase en automático durante la compra.
- Recompra (`/recompra`), favoritos o recetas guardadas para invitados.
- Recoger en tienda: la tienda no tiene sucursales (`docs/BRAND.md`).
- Códigos de descuento, fecha de cumpleaños y datos de facturación que muestra Devlyn.
- Cambiar el checkout de clientes con sesión.

## Dependencies

- SPEC 19: el checkout actual y sus reglas de receta.
- SPEC 23 (no bloqueante): la dirección del invitado se captura con el mismo formulario.
- Turnstile ya está integrado en login y registro (`useTurnstile`); el backend valida su token.
- Correo transaccional (`internal/email`, outbox de `0008_email_outbox.sql`).

## Functional requirements

1. Migración: `shop.orders.user_id` pasa a aceptar `NULL` y se agrega `guest_contact jsonb` (correo, nombre, apellidos, teléfono, aviso de promociones) y `guest_token_hash text`. Una restricción exige que un pedido tenga `user_id` o `guest_contact`, nunca ninguno.
2. `POST /v1/checkout/guest` no lleva sesión. Exige `X-Cart-Token`, un token de Turnstile válido y el cuerpo `GuestCheckoutInput`. Si llega con un bearer válido responde `409` con `type: use-account-checkout` para que la tienda use el checkout normal.
3. Valida igual que el checkout de cliente: carrito no vacío, existencias, precios de la base y receta cuando un producto la requiere. La dirección se valida con las mismas reglas de `AddressInput` y se copia al pedido en `shipping_address`, como hoy.
4. **Una compra pendiente por carrito:** un segundo checkout de invitado con el mismo `cart_token` vence el pedido pendiente anterior y devuelve lo apartado.
5. La receta del invitado es solo el archivo (foto o PDF; decisión del responsable). Se sube con `POST /v1/guest/prescriptions/upload-url` (sin sesión, exige `X-Cart-Token`; mismas reglas de tipo y tamaño que la de clientes) y se manda en el checkout como `prescription_upload` con su `r2_key`. Los valores ópticos ya van en cada renglón del carrito. La API crea la receta en estado `pending`, ligada al pedido y no a un cliente.
6. La respuesta incluye `order_token`: un valor aleatorio de 32 bytes que la API guarda solo como hash. Sirve para `GET /v1/guest/orders/{id}` con el encabezado `X-Order-Token`. Un token o id incorrecto responde `404`, sin distinguir cuál falló. El token deja de servir 90 días después de la entrega (`delivered_at` + 90 días); mientras el pedido no se entrega, sigue vigente. Un token vencido también responde `404`.
7. El correo de confirmación de pago (y los de cambio de estado) se manda a `guest_contact.email` con un enlace `/pedido/{id}?t={order_token}`. El token también se incluye en la `back_url` de Mercado Pago para que la tienda muestre el pedido al volver.
8. **Ligar pedidos a una cuenta:** cuando un cliente confirma su correo (o entra con Google con un correo verificado) y ese correo coincide con `guest_contact.email` de pedidos de invitado, esos pedidos pasan a su `user_id` en el primer request autenticado (el mismo momento en que hoy se hace el upsert en `customers`). Sus recetas de invitado pasan con ellos. Solo se ligan con correo verificado (`email_confirmed_at` en el JWT).
9. Límite: 10 checkouts de invitado por IP por hora; el siguiente responde `429`.
10. `lentes-admin` muestra los pedidos de invitado con su contacto (en su propio spec; aquí solo se exige que `GET /v1/admin/orders` devuelva `guest_contact`).

## Interfaces & contracts

Nuevo en `lentes-api/api/openapi.yaml`:

```yaml
/v1/checkout/guest:
  post:
    operationId: createGuestCheckout
    parameters:
      - { name: X-Cart-Token, in: header, required: true, schema: { type: string } }
    requestBody:
      required: true
      content: { application/json: { schema: { $ref: "#/components/schemas/GuestCheckoutInput" } } }
    responses:
      "201": { content: { application/json: { schema: { $ref: "#/components/schemas/GuestCheckoutResult" } } } }
      "400": { $ref: "#/components/responses/Problem" }   # datos inválidos o CAPTCHA fallido
      "409": { $ref: "#/components/responses/Problem" }   # carrito vacío, sin existencias, falta receta, use-account-checkout
      "429": { $ref: "#/components/responses/Problem" }
      "502": { $ref: "#/components/responses/Problem" }

/v1/guest/prescriptions/upload-url:
  post:
    operationId: createGuestPrescriptionUploadUrl
    parameters:
      - { name: X-Cart-Token, in: header, required: true, schema: { type: string } }
    # mismo cuerpo y respuesta que /v1/me/prescriptions/upload-url

/v1/guest/orders/{id}:
  get:
    operationId: getGuestOrder
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      - { name: X-Order-Token, in: header, required: true, schema: { type: string } }
    responses:
      "200": { content: { application/json: { schema: { $ref: "#/components/schemas/Order" } } } }
      "404": { $ref: "#/components/responses/Problem" }

GuestContact:
  type: object
  required: [email, first_name, last_name, phone]
  properties:
    email: { type: string, format: email }
    first_name: { type: string, minLength: 1, maxLength: 80 }
    last_name: { type: string, minLength: 1, maxLength: 80 }
    phone: { type: string, pattern: "^[0-9]{10}$" }
    marketing_opt_in: { type: boolean, default: false }

GuestPrescriptionInput:
  type: object
  required: [r2_key]
  properties:
    r2_key: { type: string }
    # valores por ojo opcionales, mismos campos que PrescriptionInput

GuestCheckoutInput:
  type: object
  required: [contact, address, captcha_token]
  properties:
    contact: { $ref: "#/components/schemas/GuestContact" }
    address: { $ref: "#/components/schemas/AddressInput" }   # is_default se ignora
    prescription_upload: { allOf: [{ $ref: "#/components/schemas/GuestPrescriptionInput" }], nullable: true }
    glasses_prescription_upload: { allOf: [{ $ref: "#/components/schemas/GuestPrescriptionInput" }], nullable: true }
    captcha_token: { type: string }

GuestCheckoutResult:
  allOf:
    - $ref: "#/components/schemas/CheckoutResult"
    - type: object
      required: [order_token]
      properties:
        order_token: { type: string, description: "Se muestra una sola vez; la API guarda solo su hash" }
```

## Non-functional requirements

- El token del pedido se compara en tiempo constante y nunca se escribe en logs ni en PostHog.
- El contacto y la receta del invitado son datos personales y de salud: mismas reglas de acceso y retención que los de clientes (`docs/SECURITY.md`).

## Edge cases

- El correo del invitado ya tiene cuenta: el pedido se crea como invitado y se liga a esa cuenta la siguiente vez que el cliente entre con su correo verificado (requisito 8).
- El carrito cambia entre que se abre el checkout y se paga: aplica la misma regla de hoy (se cobran los precios de la base al apartar).
- El invitado vuelve de Mercado Pago sin pagar y reintenta: el pedido pendiente anterior se vence y se crea otro.
- `X-Cart-Token` ausente o de un carrito ya convertido en pedido pagado: `409` carrito vacío.
- Un pago aprobado tarde (OXXO/SPEI) en un pedido de invitado: mismo manejo que hoy para clientes.
- La receta subida no se registra (el invitado abandona): el archivo queda huérfano en R2. La limpieza de huérfanos ya existente debe cubrir también la ruta de invitados.

## Acceptance criteria

- [ ] La migración permite pedidos sin `user_id` solo cuando tienen `guest_contact`.
- [ ] `POST /v1/checkout/guest` crea el pedido, aparta y devuelve `init_point` y `order_token` con un carrito anónimo válido.
- [ ] Sin CAPTCHA válido responde `400`; con bearer válido responde `409 use-account-checkout`; el 11.º intento por IP en una hora responde `429`.
- [ ] Un carrito que requiere receta sin `prescription_upload` responde `409`.
- [ ] El webhook paga un pedido de invitado igual que uno de cliente (prueba de integración).
- [ ] `GET /v1/guest/orders/{id}` con el token correcto devuelve el pedido; con token o id incorrecto, `404`.
- [ ] Al entrar con una cuenta de correo verificado igual al del invitado, sus pedidos de invitado aparecen en `GET /v1/me/orders`; con correo sin verificar, no.
- [ ] Un token de pedido entregado hace más de 90 días responde `404`.
- [ ] El correo de confirmación llega a `guest_contact.email` con el enlace al pedido.
- [ ] Las pruebas existentes del checkout de clientes siguen pasando sin cambios.

## Risks

- **Abuso del apartado:** sin cuenta, un bot podría apartar existencias. Mitigación: Turnstile, límite por IP y vencimiento de 15 minutos.
- **Enlace del pedido filtrado:** quien tenga el enlace ve la dirección del invitado. Mitigación: token de 32 bytes y la vista de invitado oculta la receta.
- **Ligar por correo:** alguien que controle el buzón de un invitado verá sus pedidos al registrarse. Es aceptable: ese buzón ya recibe los enlaces de los pedidos.
