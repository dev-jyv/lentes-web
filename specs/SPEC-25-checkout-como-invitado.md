# SPEC 25 — Checkout como invitado en la tienda

> **Status:** Implemented — lentes-web 33ebbd7, lentes-api da42423 y 30e82d4
> **Depends on:** SPEC 19, SPEC 23, SPEC 24
> **Date:** 2026-11-18
> **Objective:** Dejar que un visitante sin cuenta pague desde el carrito con un paso de identificación (correo, nombre, apellidos y teléfono) antes del envío y el pago del checkout en acordeón.

## Context

En el carrito lateral el botón "Continuar al pago" lleva a `/checkout`, y `proxy.ts` (lista `PROTECTED`) manda a cualquiera sin sesión a `/login?next=/checkout`. Quien compra por primera vez tiene que crear cuenta y confirmar su correo antes de pagar.

El responsable pidió el flujo de Devlyn (capturas del 2026-11-18):

1. **Identificación:** "Solicitamos únicamente la información esencial": correo, nombre, apellidos y teléfono celular. Botón "Ir para la Entrega".
2. **Envío:** empieza por el código postal, completa colonia, municipio y estado, y pide calle, número exterior, referencias, número interior y destinatario (prellenado con el nombre). Muestra el método de entrega.
3. **Pago:** los pasos anteriores quedan como resúmenes con un ícono de editar. El resumen de compra está a la derecha con el total y "Comprar ahora".

Nuestro checkout (SPEC 19) ya es un acordeón con Dirección → Receta → Pago, pasos completados con "Cambiar", y un resumen lateral. Este spec le agrega el paso de identificación para invitados y la entrada sin sesión. El backend está en SPEC 24 y el autocompletado del código postal en SPEC 23. Se toma de Devlyn el flujo, no su marca, colores ni promesas (sin recoger en tienda, sin cupones ni cumpleaños).

## Goals

- "Continuar al pago" funciona sin sesión y abre el checkout de invitado sin pasar por login.
- Al inicio del checkout el visitante elige "Iniciar sesión" o "Continuar como invitado", y lo que lleva en el carrito no se pierde con ninguna de las dos.
- El invitado completa Identificación → Envío → Receta (si aplica) → Pago en el mismo acordeón de SPEC 19.
- Al volver de Mercado Pago, el invitado ve su pedido y recibe el enlace por correo.
- Tras pagar se ofrece crear una cuenta con el correo ya capturado, sin obligar.

## Non-goals

- Recoger en tienda, códigos de descuento, fecha de cumpleaños, "Sumar datos de empresa" y el botón de WhatsApp de Devlyn.
- Guardar el contacto o la dirección del invitado para su siguiente compra (más allá del borrador local del formulario).
- Cambiar el checkout de clientes con sesión, salvo que la dirección usa el autocompletado de SPEC 23.
- Rediseñar el carrito lateral.

## Dependencies

- SPEC 19: acordeón, `Stepper`, `StepPanel`, resumen y `CheckoutSkeleton` de `components/tienda/checkout-form.tsx`.
- SPEC 23: `AddressForm` con autocompletado por código postal.
- `AddressInput.references` y `ShippingAddress.references` (nullable, máximo 200) ya están en `lentes-api`, rama `feature/addresses-delivery-references`, migración `0019_address_references.sql`.
- SPEC 24: `createGuestCheckout`, `createGuestPrescriptionUploadUrl` y `getGuestOrder`, que llegan con `pnpm api:sync`.

## Functional requirements

1. `/checkout` sale de `PROTECTED` en `lib/supabase/proxy.ts`. La página decide con la sesión del navegador:
   - Con sesión: el checkout de hoy, sin cambios de flujo.
   - Sin sesión: una tarjeta inicial con "Continuar como invitado" como acción principal (decisión del responsable) y "Iniciar sesión" como secundaria (usa `LoginForm` en línea; al entrar, el carrito se une como hoy y sigue el checkout normal).
2. **Paso Identificación** (solo invitado): correo, nombre, apellidos y teléfono de 10 dígitos, más la casilla de promociones cuando `LEGAL_REVIEWED`. Botón "Continuar al envío". Completado, se resume en dos líneas (correo · nombre · teléfono) con "Cambiar".
3. **Paso Envío** (invitado): `AddressForm` con código postal primero (SPEC 23), sin "predeterminada", y con el destinatario prellenado con nombre y apellidos. Incluye **Referencias** obligatorias en la tienda (máximo 200 caracteres, p. ej. "entre calles, portón negro"); también se piden al crear o editar direcciones en `/cuenta/direcciones`. En el contrato el campo `references` es opcional para no romper las direcciones guardadas antes. No se guarda en `/me/addresses`; vive en el estado del checkout. Muestra el envío vigente: "Gratis" o su costo, como ya lo calcula la API.
4. **Paso Receta** (invitado, solo si el carrito la requiere): subir la foto o PDF de la receta con la misma validación de tipo y tamaño que `/cuenta/recetas`. El archivo se sube con `createGuestPrescriptionUploadUrl`.
5. **Paso Pago:** un Turnstile y el botón "Pagar con Mercado Pago". Llama a `createGuestCheckout`, guarda `order_id` y `order_token` en `sessionStorage` y redirige al `init_point`.
6. Los datos de Identificación y Envío se conservan en `sessionStorage` mientras dura la pestaña, para que un recargo o el regreso desde Mercado Pago no obliguen a escribir de nuevo. La receta no se guarda localmente.
7. **Página del pedido de invitado** `/pedido/[id]?t=…`: usa `getGuestOrder` y reutiliza `OrderDetail` (SPEC 22) sin datos de receta. Con token inválido muestra "No encontramos este pedido" y un enlace a la tienda. Lleva `ph-no-capture` y `robots: noindex`.
8. Al volver de Mercado Pago como invitado, la tienda lleva a `/pedido/[id]?t=…`. Ahí, si el pedido está pagado, se ofrece "Crea tu cuenta para seguir tus pedidos", que abre `/registro` con el correo prellenado.
9. Los mensajes de error de la API (`detail` en español) se muestran en el paso que corresponde: existencias y receta en su paso; CAPTCHA y `429` en Pago.
10. Analítica: `checkout_started` lleva la propiedad `guest: true|false`. No se manda ningún dato de contacto a PostHog.

## Interfaces & contracts

Rutas de la tienda:

| Ruta | Acceso | Qué muestra |
|---|---|---|
| `/checkout` | pública | Con sesión, checkout de cliente; sin sesión, elección y checkout de invitado |
| `/pedido/[id]?t={order_token}` | pública con token | Detalle del pedido de invitado |

Estado local (`sessionStorage`, clave `guest-checkout`):

```ts
type GuestDraft = {
  contact: { email: string; first_name: string; last_name: string; phone: string; marketing_opt_in: boolean };
  address: Omit<AddressInput, "is_default">;
  order?: { id: string; token: string };
};
```

Llamadas: `createGuestCheckout`, `createGuestPrescriptionUploadUrl` y `getGuestOrder` de `lib/api/generated` (SPEC 24). El mutator ya manda `X-Cart-Token`.

Textos nuevos en `messages/es-MX.json` bajo `checkout.guest.*` y `guestOrder.*`.

## Non-functional requirements

- Todo el checkout y `/pedido/[id]` llevan `ph-no-capture` (contacto, dirección y receta).
- El token del pedido no aparece en eventos de analítica ni en el título de la página.
- El paso Identificación cumple la guía de formularios del sitio: `autocomplete` (`email`, `given-name`, `family-name`, `tel-national`), `inputMode="numeric"` en el teléfono y errores asociados con `aria-describedby`.

## Edge cases

- El invitado inicia sesión a mitad del checkout (por ejemplo, desde el header): se descarta el borrador de invitado y se muestra el checkout de cliente con el carrito unido.
- El correo del invitado ya tiene cuenta: no se bloquea. Bajo el campo aparece "¿Ya tienes cuenta? Inicia sesión" como sugerencia, sin revelar si el correo existe.
- El carrito queda vacío (se pagó en otra pestaña): el checkout muestra el estado vacío de hoy.
- `sessionStorage` no está disponible (navegación privada estricta): el flujo funciona y solo no recuerda los datos.
- El invitado vuelve de Mercado Pago sin pagar: ve el pedido "Pendiente de pago" y puede volver a `/checkout`, donde sus datos siguen prellenados.
- Error `502` de Mercado Pago: aviso en el paso Pago y el botón queda disponible para reintentar.

## Acceptance criteria

- [ ] Sin sesión, "Continuar al pago" abre `/checkout` sin redirigir a login.
- [ ] La tarjeta inicial ofrece iniciar sesión en línea y continuar como invitado; iniciar sesión conserva el carrito.
- [ ] El invitado completa Identificación, Envío con autocompletado por código postal, Receta cuando aplica y Pago, y llega a Mercado Pago.
- [ ] El paso Envío no avanza sin Referencias, y las referencias aparecen en el resumen del paso y en el detalle del pedido.
- [ ] Cada paso completado se resume y se puede reabrir con "Cambiar".
- [ ] Recargar la página conserva contacto y dirección dentro de la misma pestaña.
- [ ] `/pedido/[id]?t=…` muestra el pedido con un token válido y "No encontramos este pedido" con uno inválido.
- [ ] El checkout de clientes con sesión sigue pasando su suite E2E (SPEC 20).
- [ ] Nuevas pruebas E2E del flujo de invitado con `POST /v1/checkout/guest` interceptado, en escritorio y móvil.

## Risks

- **Cuentas duplicadas en la práctica:** un cliente con cuenta que compra como invitado no verá ese pedido en "Mis pedidos" (depende de la respuesta abierta de SPEC 24 sobre ligar pedidos).
- **Datos en `sessionStorage`:** contacto y dirección quedan en el navegador durante la pestaña. Mitigación: se borran al pagar y no se guarda la receta.
