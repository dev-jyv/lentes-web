# SPEC 19 — Checkout en acordeón por pasos

> **Status:** Implemented — commit 76265b4
> **Depends on:** SPEC 04, SPEC 17
> **Date:** 2026-11-18
> **Objective:** Rediseñar `/checkout` como un acordeón de pasos (dirección, receta, pago) con avance real, resumen con miniaturas y la identidad visual del sitio.

## Context

El checkout actual (`app/(tienda)/checkout/page.tsx` + `components/tienda/checkout-form.tsx`) es una sola columna con la dirección, los selectores de receta y un resumen fijo de 380 px. Tiene problemas visibles:

- El indicador de pasos pinta los tres números en azul aunque nada esté completo: no comunica avance.
- Los pasos se separan con un guion en monoespaciada (`.optic`), que es la tipografía de valores ópticos, no de navegación.
- El botón "Pagar con Mercado Pago" vive en el resumen y parece deshabilitado; no queda claro qué falta para pagar.
- El resumen no tiene imagen del producto, y la nota "El backend valida precios y stock al pagar…" usa lenguaje técnico frente al cliente.
- La dirección elegida, la receta y el pago no se leen como pasos de un flujo.

El responsable eligió el patrón de acordeón paso a paso (un paso abierto a la vez; los completados se cierran con un resumen y "Cambiar"), en la línea de EyeBuyDirect, que ya es la referencia del sitio para header, login y favoritos. La lógica de negocio (qué receta se exige, cuál se preselecciona, el `POST /v1/checkout` y la redirección a Mercado Pago) no cambia.

## Goals

- El checkout se presenta como acordeón: Dirección → Receta (solo si el carrito la necesita) → Pago.
- El indicador de pasos refleja el estado real de cada paso: pendiente, actual o completado.
- Cada paso completado muestra en una línea lo elegido y un botón "Cambiar".
- El botón de pago vive en el paso Pago y solo se habilita cuando los pasos previos están completos.
- El resumen muestra miniatura, nombre, detalle de armazón y total, y en móvil se colapsa arriba del acordeón.
- Todo usa tokens, tipografías y componentes existentes (`components/ui`, `globals.css`); nada de colores nuevos.

## Non-goals

- Cambiar reglas de negocio: qué receta se exige, la preselección (aprobada primero para lentes de contacto, la más reciente para armazones) o el contrato de `POST /v1/checkout`.
- Cálculo de envío, cupones o descuentos: la API no los tiene.
- Pago embebido (Bricks) en lugar de la redirección a Checkout Pro.
- Editar o borrar direcciones guardadas desde el checkout (eso es `/cuenta`).
- Subir una receta dentro del checkout: se sigue enlazando a `/cuenta/recetas`.
- Rediseñar `/checkout/resultado`.
- Eventos de analítica nuevos por paso; se conserva `checkout_started`.
- Promesas no respaldadas (envío gratis, entrega exprés, "compra 100 % protegida", etc.).

## Dependencies

- SPEC 04 (compra de armazón con micas): define la receta de armazones, `frame_lead_time_days` y la nota de micas a medida.
- SPEC 17 (configurador de micas): define que la receta de armazones recién subida, aunque esté en revisión, se preselecciona.

## Functional requirements

### Estructura

1. `page.tsx` conserva el título "Finalizar compra" y `metadata`; el indicador de pasos se mueve dentro del componente cliente, porque depende del estado.
2. Los pasos visibles son `address`, `prescription` y `payment`. `prescription` solo existe si `needsRx || needsGlassesRx`; si no, los pasos se numeran 1 y 2.
3. Al cargar, se abre el **primer paso incompleto**. Un paso está completo cuando:
   - `address`: hay `addressId` resuelto (elegido, predeterminado o el primero).
   - `prescription`: cada receta exigida tiene un id resuelto (misma lógica actual que `rxMissing`).
   - `payment`: nunca se marca completo; es el paso final.
4. Solo un paso está abierto a la vez. Abrir uno cierra el resto.

### Indicador de pasos

5. Una lista ordenada (`<ol>`) arriba del acordeón, con un estado por paso:
   - completado: círculo con ícono de palomita (`Check` de Lucide) en `--blue`; el paso es un botón que abre ese paso.
   - actual: círculo relleno `--blue` con el número y texto en `--ink`, marcado con `aria-current="step"`.
   - pendiente: círculo con borde `--line`, número y texto en `muted-foreground`; no es interactivo.
6. Entre pasos va un conector horizontal (línea de 1 px), no un guion de texto. El texto usa la tipografía de cuerpo, no `.optic`.

### Paso Dirección

7. Abierto: la lista de direcciones guardadas como tarjetas seleccionables (radio nativo oculto a la vista pero accesible, con borde `--blue` y fondo `--blue-soft` al elegir), el botón "Agregar otra dirección" y "Continuar".
8. Sin direcciones guardadas, el formulario aparece directamente. Usa los mismos campos y validación zod actuales (CP de 5 dígitos, teléfono de 10), con `autocomplete` apropiado en cada campo (`name`, `address-line1`, `postal-code`, `tel`, etc.).
9. Al guardar una dirección nueva: se invalida `getListAddressesQueryKey()`, la dirección queda elegida y el acordeón avanza al siguiente paso.
10. Cerrado y completado: una línea con "destinatario · calle número, colonia, CP" y "Cambiar".

### Paso Receta

11. Para cada receta exigida (lentes de contacto y/o armazones), un grupo de radios con título propio, como hoy (`checkout.rx.*`). Cada tarjeta muestra el médico, el estado (`rxStatusLabel`), los valores OD/OI en `.optic` y la vigencia.
12. Si no hay receta utilizable para un tipo, se muestra el texto vacío actual con el enlace "Sube tu receta" a `/cuenta/recetas`, y "Continuar" queda deshabilitado.
13. Cerrado y completado: una línea con médico y estado por cada receta elegida, y "Cambiar".

### Paso Pago

14. Muestra un recordatorio breve de dirección y receta(s) elegidas, el texto de que el pago se completa en Mercado Pago, y el botón primario "Pagar con Mercado Pago" a ancho completo, de tamaño `lg`.
15. El botón está habilitado solo si los pasos previos están completos y no hay un pago en curso. Mientras está en curso muestra "Redirigiendo…" con `aria-busy="true"`.
16. Los errores de `createCheckout` se muestran en este paso con `role="alert"`, con el mismo mapeo actual (`checkoutMessage`). Un `409` invalida el carrito, como hoy.
17. En éxito, `window.location.assign(init_point)`, sin cambios.

### Resumen

18. En escritorio (≥1024 px) es una columna fija de 380 px (`lg:sticky`) con:
    - Por artículo: miniatura de `product.image_url` (64 px, `imageSrc`, con un ícono de respaldo si es `null`), cantidad y nombre, total de la línea en `formatMxn` y `FrameDetails` para armazones.
    - Subtotal en `font-display`, más grande que las líneas.
    - Notas: precio (texto nuevo, ver Interfaces), tiempo de entrega y micas a medida (sin cambios).
    - No lleva botón de pago.
19. En móvil (<1024 px) va arriba del acordeón como `<details>`/`<summary>` cerrado por defecto, con "Ver resumen" y el subtotal visibles en la línea del `<summary>`.

### Estados

20. Carga: un esqueleto con la forma del layout (indicador, tres bloques y la columna de resumen), no un solo bloque gris.
21. Carrito vacío: estado vacío centrado con ícono, el texto actual y dos botones ("Ver armazones" y "Ver lentes de contacto") en vez de enlaces dentro de una oración.

## Interfaces & contracts

Sin cambios en la API. Se usan `useGetCart`, `useListAddresses`, `useListPrescriptions`, `createAddress` y `createCheckout` tal como hoy.

Archivos:

- `app/(tienda)/checkout/page.tsx`: queda solo el título y `<CheckoutForm />`.
- `components/tienda/checkout-form.tsx`: se reorganiza en subcomponentes locales (`CheckoutSteps`, `StepPanel`, `AddressStep`, `RxStep`, `PaymentStep` y `OrderSummary`) dentro del mismo archivo, salvo que pase de unas 400 líneas; en ese caso se divide en `components/tienda/checkout/`.

Textos en `messages/es-MX.json` (`checkout.*`):

| Clave | Texto |
|---|---|
| `checkout.continue` | Continuar |
| `checkout.change` | Cambiar |
| `checkout.stepDone` | {{step}}: completado |
| `checkout.payment.title` | Pago |
| `checkout.payment.note` | Te llevaremos a Mercado Pago para completar el pago de forma segura. |
| `checkout.summaryToggle` | Ver resumen |
| `checkout.priceNote` (cambia) | Confirmamos precios y existencias al pagar; el total final puede variar por envío. |
| `checkout.emptyCart` (cambia) | Tu carrito está vacío. |
| `checkout.browseFrames` | Ver armazones |
| `checkout.browseLenses` | Ver lentes de contacto |

Accesibilidad del acordeón: cada encabezado de paso es un `<h2>` que contiene un `<button aria-expanded aria-controls>`; el panel es `role="region"` con `aria-labelledby`. Un paso pendiente lleva `aria-disabled="true"` y no se puede abrir.

## Non-functional requirements

- Privacidad: el contenedor raíz conserva `ph-no-capture` (direcciones y recetas).
- Accesibilidad: todo se puede operar con teclado. Al pulsar "Continuar" o "Cambiar", el foco va al botón del paso que se abre. El contraste es AA, con texto blanco solo sobre `--blue` o más oscuro. Las animaciones de apertura se desactivan con `prefers-reduced-motion`, como el resto del sitio.
- Tema oscuro: se ve correcto en `data-theme="dark"` usando solo tokens.
- Sin dependencias nuevas.
- El HTML conserva roles y nombres accesibles estables, porque SPEC 20 los usa como selectores.

## Edge cases

- Carrito sin artículos que requieran receta: el paso Receta no se renderiza y Pago es el paso 2.
- Carrito con lentes de contacto **y** armazón graduado: dos grupos de receta en el mismo paso; se completa solo cuando ambos tienen selección.
- Sin direcciones: el paso Dirección abre directamente el formulario. Cancelar no está disponible porque no hay nada que elegir.
- Se pulsa "Agregar otra dirección" y luego se quiere volver: hay un botón "Cancelar" que regresa a la lista.
- Falla `createAddress`: error en línea, el paso no avanza y los datos capturados se conservan.
- La receta preseleccionada caduca entre la carga y el pago: la API responde `409` con `detail` en español, se muestra en Pago y se invalida el carrito. No se reabre el paso solo.
- `409` por existencias: el mensaje se muestra y el resumen se actualiza al refrescar el carrito; si queda vacío, aparece el estado de carrito vacío.
- `502` o `503` de Mercado Pago: mensaje en Pago, el botón se reactiva y se puede reintentar.
- Imagen de producto `null` o rota: ícono de respaldo, sin salto de layout (tamaño fijo).
- Doble clic en Pagar: el segundo clic no dispara otro `createCheckout` (botón deshabilitado mientras `paying`).
- La sesión expira a mitad del flujo: lo cubre `proxy.ts` en la siguiente navegación; no se añade manejo especial.

## Acceptance criteria

- [ ] Con dirección predeterminada y un carrito que no necesita receta, `/checkout` abre directamente el paso Pago, con Dirección marcada como completada.
- [ ] El indicador marca completado, actual y pendiente correctamente, y `aria-current="step"` está en el paso abierto.
- [ ] "Cambiar" en un paso completado lo abre, cierra los demás y mueve el foco al encabezado del paso.
- [ ] Un paso pendiente no se puede abrir con clic ni con teclado.
- [ ] Guardar una dirección nueva la selecciona y avanza al siguiente paso.
- [ ] Sin receta utilizable, el paso Receta muestra el enlace a `/cuenta/recetas` y "Continuar" queda deshabilitado.
- [ ] "Pagar con Mercado Pago" solo aparece habilitado en el paso Pago con los pasos previos completos, y redirige al `init_point`.
- [ ] Los errores de `createCheckout` aparecen en el paso Pago con `role="alert"`.
- [ ] El resumen muestra miniaturas y subtotal; en <1024 px es un `<details>` colapsado arriba del acordeón.
- [ ] La nota de precio ya no menciona "backend".
- [ ] Se ve correcto en tema claro y oscuro, y en 375 px de ancho sin scroll horizontal.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.
- [ ] Las pruebas de SPEC 20 pasan.

## Risks

- Abrir automáticamente el primer paso incompleto puede ocultar la dirección elegida a quien no revisa; se mitiga mostrando la línea de resumen del paso completado y el recordatorio en Pago.
- Reorganizar `checkout-form.tsx` puede alterar sin querer la preselección de receta de SPEC 17; la lógica de `firstUsable`, `newest` y `rxMissing` se mueve sin cambiarla.
