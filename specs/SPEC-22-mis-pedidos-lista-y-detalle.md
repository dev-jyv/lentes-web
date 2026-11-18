# SPEC 22 — Mis pedidos: lista y detalle

> **Status:** Implemented — commit 6860506
> **Depends on:** SPEC 21
> **Date:** 2026-11-18
> **Objective:** Rediseñar `/cuenta/pedidos` como tarjetas de pedido con estado visual y agregar la página de detalle `/cuenta/pedidos/[id]`.

## Context

`components/cuenta/order-history.tsx` lista los pedidos en filas de texto pequeño: folio, total, fecha, unidades, líneas de armazón, guía y una insignia de estado, con paginación por cursor (`listMyOrders`) y "Volver a pedir" (`/recompra/{id}`). No existe una página de detalle, aunque la API la ofrece: `GET /v1/me/orders/{id}` (`Order`, con `items: OrderItem[]`, subtotal, envío, descuento y total).

`OrderItem` trae producto, marca, `product_slug`, `category`, SKU, ojo, cantidad, precio pagado, valores ópticos, paquete y tratamiento de micas, y color. **No** trae imagen ni dirección de envío, y `Order` tampoco trae la dirección.

`OrderStatus` tiene `pending_payment`, `paid`, `preparing`, `shipped`, `delivered`, `cancelled`, `refunded` y `expired`.

## Goals

- La lista muestra cada pedido como una tarjeta con folio, fecha, estado con color, total, resumen de artículos y acciones.
- Filtro rápido por estado: Todos, En curso y Entregados.
- `/cuenta/pedidos/[id]` muestra una línea de avance del estado, los artículos con sus valores ópticos, el desglose de importes, la guía y "Volver a pedir".
- Pruebas E2E de la lista y el detalle.

## Non-goals

- Imágenes de producto y dirección de envío en el detalle: el contrato no las trae. Pedirlas a `lentes-api` sería otro spec.
- Cancelar o devolver un pedido desde la cuenta.
- Factura o CFDI.
- Seguimiento en vivo con la paquetería: solo se muestra la guía como texto.
- Reintentar el pago de un `pending_payment`: la API no expone el `init_point` de un pedido existente.
- Búsqueda por folio.

## Dependencies

- SPEC 21: el layout del panel y la tarjeta "Último pedido" enlazan al detalle.

## Functional requirements

### Lista (`/cuenta/pedidos`)

1. Cada pedido es una tarjeta (`Card`) con:
   - encabezado: folio (`orderFolio`, en `.optic`), fecha (`created_at`, `es-MX`, `America/Mexico_City`) e insignia de estado;
   - cuerpo: `frame_lines` (o "{n} cajas de lentes de contacto" con `orders.units`) y el total en `formatMxn`, destacado;
   - pie: "Ver detalle" (enlace a `/cuenta/pedidos/{id}`) y "Volver a pedir" si `canReorder(status) && reorderable`;
   - la guía, si existe, con la paquetería.
2. Colores de estado con tokens existentes:
   - en curso (`paid`, `preparing`, `shipped`): `--blue-soft` y `--blue`;
   - `delivered`: `--good`;
   - `pending_payment`: `--sun-soft` con texto marino;
   - `cancelled`, `refunded` y `expired`: `muted`.
   La insignia siempre lleva texto (`orderStatusLabel`), no solo color.
3. Filtro con tres botones de alternancia (`aria-pressed`): Todos, En curso (`pending_payment`, `paid`, `preparing` y `shipped`) y Entregados (`delivered`). Filtra en el cliente sobre las páginas cargadas, porque la API no tiene filtro por estado; "Ver más" sigue cargando páginas. El filtro vive en `?estado=` para que se pueda compartir y recargar.
4. Se conservan la paginación por cursor, el estado de error con "Reintentar", el estado vacío y la query key `["my-orders"]`.
5. Carga: tres tarjetas esqueleto con la forma de la tarjeta.

### Detalle (`/cuenta/pedidos/[id]`)

6. Página cliente dentro del panel que usa `useGetOrder(id)`. El título es "Pedido {folio}" y hay un enlace "← Mis pedidos" arriba.
7. Línea de avance horizontal (vertical en <600 px) con Pagado, En preparación, Enviado y Entregado. Los pasos alcanzados se marcan según `status` (y `paid_at`). Para `pending_payment`, `cancelled`, `refunded` y `expired` no se dibuja la línea: se muestra un aviso con el estado y una explicación breve.
8. Artículos agrupados por línea:
   - lentes de contacto: producto, marca, ojo (OD/OI), cantidad, precio unitario y, en `.optic`, esfera, cilindro, eje, adición, curva base y diámetro (solo los que no son `null`);
   - armazones: producto, marca, color, paquete de micas (`lens_package_name`), tratamiento con su precio (`treatment_price_cents`) y precio.
   - El nombre del producto enlaza a su ficha con `productHref`.
9. Desglose: subtotal, envío (o "Gratis" si es 0 y el pedido está pagado; si no está pagado, se oculta), descuento (solo si es mayor que 0) y total.
10. Guía: paquetería y número en `.optic`, con un botón "Copiar" (`navigator.clipboard`) y confirmación con toast.
11. "Volver a pedir" con las mismas condiciones de la lista.
12. `404` o un pedido de otro cliente: estado "No encontramos este pedido" con enlace a la lista. Error de red: "Reintentar".
13. `metadata`: `robots: { index: false }` y título genérico "Pedido". El folio no va al `<title>` del servidor.

## Interfaces & contracts

Sin cambios de API. Se usan `listMyOrders` (ya en uso) y `useGetOrder` (generado).

Archivos:

- Cambia: `components/cuenta/order-history.tsx`.
- Nuevos: `app/(cuenta)/cuenta/(panel)/pedidos/[id]/page.tsx`, `components/cuenta/order-detail.tsx` y `components/cuenta/order-status-badge.tsx` (insignia compartida por la lista, el detalle y el resumen de SPEC 21).
- `lib/order.ts`: se agrega `orderProgress(status)`, que devuelve el índice del paso alcanzado o `null` si no aplica.

Textos nuevos bajo `orders.*`: `filter.*` (all, active, delivered), `viewDetail`, `back`, `detailTitle`, `progress.*` (paid, preparing, shipped, delivered), `notice.*` (pendingPayment, cancelled, refunded, expired), `items`, `eye.*` (right, left), `breakdown.*` (subtotal, shipping, free, discount, total), `copyTracking`, `copied` y `notFound`.

## Non-functional requirements

- `ph-no-capture` en la lista y el detalle (valores ópticos, que son datos de salud).
- Accesibilidad: la línea de avance es un `<ol>` con el paso actual en `aria-current="step"` y texto para lectores de pantalla en cada paso ("completado" o "pendiente").
- Sin dependencias nuevas.

## Edge cases

- Pedido con lentes de contacto y armazón juntos: los dos grupos de artículos en el detalle; la tarjeta muestra `frame_lines` más el conteo de cajas.
- `frame_lines` vacío y `units` 0: no debería pasar; la tarjeta muestra solo el total.
- `shipped` sin guía: la línea marca Enviado y se omite el bloque de guía.
- Filtro "Entregados" sin coincidencias en las páginas cargadas pero con más páginas: muestra "Ver más" con el texto "No hay pedidos entregados en los más recientes".
- `navigator.clipboard` no disponible: se oculta "Copiar".
- `id` que no es un UUID: la API responde `400` o `404`; se trata igual que no encontrado.

## Acceptance criteria

- [ ] La lista muestra tarjetas con folio, fecha, estado con color y texto, artículos, total y acciones.
- [ ] El filtro En curso o Entregados filtra y se conserva en `?estado=` al recargar.
- [ ] "Ver detalle" abre `/cuenta/pedidos/{id}` con línea de avance, artículos con valores ópticos, desglose y guía.
- [ ] Los estados `pending_payment`, `cancelled`, `refunded` y `expired` muestran aviso en lugar de la línea de avance.
- [ ] Un id inexistente muestra "No encontramos este pedido".
- [ ] "Volver a pedir" aparece solo cuando corresponde, en la lista y en el detalle.
- [ ] Pruebas E2E en `tests/cuenta/pedidos.spec.ts`: lista visible (o estado vacío), filtro con `?estado=`, abrir detalle del primer pedido si existe (si no, `skip` con motivo), id inexistente y navegación de regreso. Pasan en `chromium` y `mobile`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.

## Risks

- La línea de avance asume el orden `paid → preparing → shipped → delivered`. Si `lentes-api` agrega estados, `orderProgress` debe actualizarse; TypeScript lo detecta si se usa un `switch` exhaustivo.
- El filtro en cliente con paginación puede confundir cuando hay muchos pedidos; es aceptable con los volúmenes actuales. Agregar `?status=` a la API sería otro spec.
- Las pruebas del detalle dependen de que el usuario de prueba tenga pedidos; si no tiene ninguno, la prueba del detalle se salta con motivo.
