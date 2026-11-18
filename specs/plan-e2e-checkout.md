# Plan de pruebas E2E — Checkout (SPEC 19 / SPEC 20)

Seed: `tests/seed.spec.ts` (checkout con sesión iniciada). Implementación: `tests/checkout/checkout.spec.ts`.
Proyectos: `chromium` (escritorio) y `mobile` (Pixel 7). Corre en serie contra la API desplegada con la cuenta de `.env`.

Precondición común: el proyecto `setup` respalda carrito, dirección predeterminada y perfil, e inicia sesión. El proyecto
`teardown` los restaura. Después de cada prueba se vacía el carrito y se borran las direcciones `E2E …`.

## 1. Sin sesión, /checkout redirige al login
- **Precondiciones:** contexto sin cookies.
- **Pasos:** 1. Abrir `/checkout`.
- **Esperado:** la URL es `/login?next=%2Fcheckout`.

## 2. Carrito vacío
- **Precondiciones:** carrito vacío.
- **Pasos:** 1. Abrir `/checkout`.
- **Esperado:** se ve "Tu carrito está vacío.", y los enlaces "Ver armazones" y "Ver lentes de contacto" apuntan a `/armazones` y `/lentes`.

## 3. Armazón sin receta abre en Pago
- **Precondiciones:** carrito con `E2E_FRAME_SLUG` ("Solo armazón"); la cuenta tiene una dirección predeterminada.
- **Pasos:** 1. Abrir `/checkout`.
- **Esperado:** el indicador tiene 2 pasos y el actual es el 2. Pago está abierto, Dirección cerrada con "Cambiar", no hay paso Receta y el botón de pago está habilitado. En escritorio, el resumen tiene 1 artículo y el subtotal.

## 4. Pagar redirige a Mercado Pago una sola vez
- **Precondiciones:** como en el escenario 3; `POST /v1/checkout` interceptado (201 lento) y Mercado Pago bloqueado.
- **Pasos:** 1. Pulsar "Pagar con Mercado Pago". 2. Pulsar otra vez mientras está ocupado.
- **Esperado:** el botón muestra "Redirigiendo…", deshabilitado y con `aria-busy`. Se envía un solo `POST` con `address_id` y recetas `null`, y se navega al `init_point`.

## 5. Error 409 en Pago (caso de error)
- **Precondiciones:** como en el escenario 3; `POST /v1/checkout` responde 409 con `detail`.
- **Pasos:** 1. Pulsar "Pagar con Mercado Pago".
- **Esperado:** aparece una alerta con el `detail` dentro de `main`, y el botón se reactiva.

## 6. Acordeón: Cambiar, foco y aria-current
- **Precondiciones:** como en el escenario 3.
- **Pasos:** 1. Abrir "Dirección de envío". 2. "Agregar otra dirección" y luego "Cancelar". 3. "Continuar".
- **Esperado:** Dirección se abre con el foco en su encabezado, Pago se cierra y el paso actual es el 1. Cancelar regresa a la lista. Continuar abre Pago y le pasa el foco.

## 7. Validación y alta de dirección (caso de error)
- **Precondiciones:** como en el escenario 3.
- **Pasos:** 1. Abrir el formulario. 2. Guardar vacío. 3. CP `0600` y teléfono `555555555`. 4. Corregir y guardar.
- **Esperado:** "Requerido" con el foco en el primer campo, luego los errores "5 dígitos" y "10 dígitos". Al guardar, la dirección queda elegida y se abre Pago.

## 8. Móvil: resumen colapsable (solo `mobile`)
- **Precondiciones:** como en el escenario 3.
- **Pasos:** 1. Abrir `/checkout`. 2. Tocar "Ver resumen".
- **Esperado:** el `<details>` empieza cerrado con el total visible, se abre y muestra el subtotal, y no hay scroll horizontal.

## 9. Lentes de contacto piden receta
- **Precondiciones:** carrito con `E2E_LENS_SLUG`.
- **Pasos:** 1. Abrir `/checkout`. 2. Abrir Receta si está cerrada. 3. "Continuar".
- **Esperado:** hay 3 pasos y una receta preseleccionada, y Pago se abre. Sin receta utilizable, "Continuar" está deshabilitado y la prueba se salta.
