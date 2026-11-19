# SPEC 21 — Panel de cuenta con perfil y direcciones

> **Status:** Implemented — commit 6860506
> **Depends on:** SPEC 11, SPEC 20
> **Date:** 2026-11-18
> **Objective:** Convertir `/cuenta` en un panel con navegación lateral donde el cliente edita sus datos personales y administra sus direcciones de envío.

## Context

Hoy `/cuenta` (`app/(cuenta)/cuenta/page.tsx`) muestra solo el email, dos enlaces subrayados ("Mis pedidos" y "Mis recetas") y "Cerrar sesión". El cliente no puede ver ni cambiar su nombre, su teléfono o su consentimiento de marketing, y solo puede crear direcciones dentro del checkout, sin editarlas ni borrarlas.

La API ya cubre todo, sin cambios de contrato:

- `GET` y `PUT /v1/me` (`Customer`: `email`, `full_name`, `phone`, `marketing_opt_in`, `created_at`).
- `GET` y `POST /v1/me/addresses`, `PUT` y `DELETE /v1/me/addresses/{id}`. `is_default` en `AddressInput` marca la predeterminada, y la API devuelve la predeterminada primero.

Las páginas hermanas (`/cuenta/pedidos`, `/cuenta/recetas`, `/cuenta/favoritos`) son columnas sueltas de `max-w-3xl` sin navegación común. `/cuenta/contrasena` usa `AuthShell` (es el destino de la recuperación de contraseña) y no debe heredar el panel.

## Goals

- Un layout de panel común para las secciones de cuenta: navegación lateral en escritorio, barra de pestañas deslizable en móvil.
- `/cuenta` pasa a ser un resumen con saludo, último pedido y accesos a cada sección.
- `/cuenta/perfil`: ver y editar nombre completo, teléfono y consentimiento de marketing. El email se muestra solo como lectura.
- `/cuenta/direcciones`: listar, agregar, editar, borrar y marcar una dirección como predeterminada.
- El formulario de dirección se comparte con el checkout (SPEC 19), en lugar de duplicarse.
- El panel lateral del header (SPEC 11) enlaza también a Datos personales y Direcciones.
- Pruebas E2E del perfil y las direcciones con la infraestructura de SPEC 20.

## Non-goals

- Cambiar el email: es un flujo de confirmación de Supabase, y queda para otro spec.
- Borrar la cuenta o exportar datos.
- Avatar o foto de perfil.
- Título y fecha de nacimiento: `Customer` no los tiene en el contrato.
- Rediseñar pedidos (SPEC 22), recetas o favoritos más allá de que se muestren dentro del panel.
- Autocompletar la dirección por código postal (no hay servicio de CP).
- Cambios en `lentes-api`.

## Dependencies

- SPEC 11: el panel lateral del header recibe dos entradas nuevas.
- SPEC 20: infraestructura de Playwright, sesión de prueba y ayudantes de API.
- SPEC 19: comparte el formulario de dirección. Si SPEC 19 se implementa después, este spec extrae el formulario y SPEC 19 lo reutiliza.

## Functional requirements

### Layout del panel

1. Las secciones con panel se mueven a un grupo de rutas: `app/(cuenta)/cuenta/(panel)/` con `layout.tsx`, `page.tsx`, `perfil/`, `direcciones/`, `pedidos/`, `recetas/` y `favoritos/`. Las URL no cambian. `contrasena/` se queda fuera del grupo.
2. El layout del panel es un componente de servidor. Obtiene el usuario con `createClient().auth.getUser()` y redirige a `/login?next=/cuenta` si no hay sesión (defensa adicional a `proxy.ts`). Envuelve todo en `ph-no-capture`.
3. Escritorio (≥1024 px): columna de navegación de 240 px con el saludo ("Hola, {nombre}", o el email si no hay nombre), entradas con ícono Lucide (Resumen, Datos personales, Direcciones, Pedidos, Recetas, Favoritos) y "Cerrar sesión" al final. El contenido va a la derecha, en el contenedor `container-page`.
4. Móvil (<1024 px): las mismas entradas en una barra horizontal deslizable bajo el título, sin scroll horizontal de la página, con la entrada activa visible al cargar.
5. La entrada activa lleva `aria-current="page"`, fondo `--blue-soft` y texto `--blue`. La navegación es un `<nav aria-label="Mi cuenta">` y se resuelve con `usePathname` en un componente cliente pequeño.

### Resumen (`/cuenta`)

6. Saludo con el nombre y "Cliente desde {mes año}" (`created_at`).
7. Tarjeta "Último pedido": folio, fecha, estado (`orderStatusLabel`) y total del primer elemento de `listMyOrders`, con un enlace a su detalle (SPEC 22) o a `/cuenta/pedidos`. Sin pedidos, invita a ver el catálogo.
8. Tarjetas de acceso a Datos personales (muestra el nombre y el teléfono o "Completa tus datos"), Direcciones (muestra la predeterminada o "Agrega una dirección") y Recetas.

### Datos personales (`/cuenta/perfil`)

9. Formulario con react-hook-form y zod:
   - `full_name`: requerido, de 2 a 120 caracteres, recortado.
   - `phone`: opcional; si viene, 10 dígitos (`validation.tenDigits`).
   - `marketing_opt_in`: casilla con el texto existente de SPEC 10. Solo se muestra si `LEGAL_REVIEWED` es verdadero, igual que en el registro; si no, se envía el valor actual sin cambiarlo.
   - `email`: solo lectura, con la nota "Para cambiar tu correo, escríbenos" sin enlace, porque no hay flujo.
10. Se precarga con `useGetMe`. "Guardar cambios" queda deshabilitado mientras el formulario no esté sucio o se esté enviando.
11. `updateMe` exitoso: invalida `getGetMeQueryKey()`, muestra un toast "Datos guardados" (`sonner`, ya instalado) y deja el formulario limpio con los valores nuevos. Un `400` muestra el `detail` de la API en un `role="alert"`.
12. Bloque "Contraseña": un enlace "Cambiar contraseña" que lleva al flujo existente de recuperación (`/cuenta/contrasena`, que ya funciona con sesión). Para clientes que solo entran con Google, se muestra "Entras con Google" en lugar del enlace (`user.app_metadata.provider === "google"` sin identidad de email).

### Direcciones (`/cuenta/direcciones`)

13. Rejilla de tarjetas (una columna en móvil, dos en ≥768 px). Cada tarjeta muestra destinatario, calle con número exterior e interior, colonia, ciudad, estado, CP y teléfono, la insignia "Predeterminada" si aplica, y las acciones "Editar", "Eliminar" y "Hacer predeterminada" (esta última solo si no lo es).
14. "Agregar dirección" abre un `Sheet` lateral (ya existe en `components/ui`) con el formulario compartido. "Editar" abre el mismo `Sheet` precargado y guarda con `updateAddress`.
15. El formulario compartido (`components/cuenta/address-form.tsx`) usa los campos, la validación zod y el `autocomplete` de SPEC 19, más una casilla "Usar como predeterminada". Recibe `address?` y `onSaved(address)`, e invalida `getListAddressesQueryKey()`.
16. "Hacer predeterminada" llama a `updateAddress` con la dirección completa e `is_default: true`.
17. "Eliminar" pide confirmación en un diálogo accesible ("¿Eliminar la dirección de {destinatario}?") y llama a `deleteAddress`. Si era la predeterminada, la API decide cuál queda; la UI solo vuelve a pedir la lista.
18. Sin direcciones: estado vacío con ícono, un texto y el botón "Agregar dirección".

### Header

19. El panel lateral de cuenta de SPEC 11 agrega "Datos personales" y "Direcciones" entre "Mi cuenta" y "Mis pedidos", con íconos coherentes con el panel.

## Interfaces & contracts

Sin cambios de API. Se usan `useGetMe`, `updateMe`, `useListAddresses`, `createAddress`, `updateAddress`, `deleteAddress` y `listMyOrders` (generados).

Archivos:

- Se mueven sin cambiar la URL: `app/(cuenta)/cuenta/{page,pedidos,recetas,favoritos}` pasan a `app/(cuenta)/cuenta/(panel)/…`.
- Nuevos: `app/(cuenta)/cuenta/(panel)/layout.tsx`, `perfil/page.tsx`, `direcciones/page.tsx`, `components/cuenta/account-nav.tsx`, `components/cuenta/account-overview.tsx`, `components/cuenta/profile-form.tsx`, `components/cuenta/address-book.tsx` y `components/cuenta/address-form.tsx`.
- Cambian: `components/tienda/checkout-form.tsx` (usa `address-form.tsx`) y `components/tienda/account-link.tsx` (dos entradas).
- `proxy.ts`: no cambia, porque `/cuenta` ya está en `PROTECTED`.

Textos nuevos en `messages/es-MX.json`, bajo `account.*`: `nav.*` (overview, profile, addresses, orders, prescriptions, favorites), `greeting`, `memberSince`, `lastOrder.*`, `profile.*` (title, fullName, phone, email, emailNote, save, saved, password, changePassword, googleOnly), `addresses.*` (title, add, edit, delete, deleteConfirm, makeDefault, default, empty, saved, deleted). El texto exacto se fija en la implementación, en el tono del resto del archivo.

## Non-functional requirements

- Privacidad: todo el panel lleva `ph-no-capture`; los datos personales no van a eventos de PostHog.
- Accesibilidad: formularios con `<Label>` asociado, errores con `aria-invalid` y `aria-describedby`, y foco al primer campo con error. El diálogo de borrado atrapa el foco y regresa al botón que lo abrió. Contraste AA en claro y oscuro.
- Sin dependencias nuevas. `Sheet`, `Badge`, `Card` y `sonner` ya existen. Si falta un diálogo de confirmación, se agrega con `pnpm dlx shadcn add alert-dialog` (componente de `components/ui`, no un paquete nuevo).
- Las páginas del panel son `robots: { index: false }`.

## Edge cases

- Cliente sin `full_name` (entró con Google o no lo capturó): el saludo usa el email y el resumen pide completar los datos.
- `GET /v1/me` falla o la red cae: mensaje con "Reintentar"; el formulario no se muestra vacío como si no hubiera datos.
- Editar el teléfono a vacío: se envía `phone: null`.
- Dos pestañas: guardar en una y luego en la otra sobrescribe con lo último (last write wins); es aceptable.
- Borrar la única dirección: queda el estado vacío; el checkout mostrará el formulario (SPEC 19).
- Borrar una dirección usada por un pedido pendiente: la API decide. Si responde `409`, se muestra su `detail`.
- `404` al editar o borrar (se borró en otra pestaña): toast con el error y recarga de la lista.
- Usuario con sesión pero sin registro de cliente en la API (primer login): `GET /v1/me` lo crea o responde `404`. Se verifica en la implementación y, si es `404`, se trata como perfil vacío editable.

## Acceptance criteria

- [ ] `/cuenta`, `/cuenta/perfil`, `/cuenta/direcciones`, `/cuenta/pedidos`, `/cuenta/recetas` y `/cuenta/favoritos` comparten el panel; `/cuenta/contrasena` no.
- [ ] La navegación marca la sección activa con `aria-current="page"` y funciona con teclado; en 375 px es una barra deslizable sin scroll horizontal de la página.
- [ ] El resumen muestra el saludo, el último pedido (o el estado vacío) y la dirección predeterminada.
- [ ] Editar nombre y teléfono persiste tras recargar; un teléfono de 9 dígitos muestra el error y no envía.
- [ ] Agregar, editar, hacer predeterminada y eliminar dirección funcionan y se reflejan sin recargar la página.
- [ ] El checkout usa el mismo `address-form.tsx`.
- [ ] El panel del header tiene las dos entradas nuevas.
- [ ] Pruebas E2E en `tests/cuenta/perfil.spec.ts` y `tests/cuenta/direcciones.spec.ts`: navegación del panel, edición de perfil (y su restauración al final), validación, y CRUD de dirección con limpieza; pasan en `chromium` y `mobile`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.

## Risks

- Mover páginas a `(panel)/` puede romper imports relativos o `metadata`; se mitiga porque las URL no cambian y el build lo detecta.
- La prueba de perfil modifica datos reales del usuario de prueba; debe guardar los valores originales y restaurarlos en `afterEach`.
- La detección de "solo Google" depende de `identities` de Supabase; si es poco fiable, se muestra el enlace siempre y el flujo de Supabase maneja el caso.
