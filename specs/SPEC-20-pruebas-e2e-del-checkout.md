# SPEC 20 — Pruebas E2E del checkout con Playwright

> **Status:** Approved
> **Depends on:** SPEC 19
> **Date:** 2026-11-18
> **Objective:** Agregar Playwright al repo con una suite E2E que recorre el checkout de SPEC 19 contra la API de desarrollo, con un usuario de prueba real.

## Context

El repo no tiene test runner (CLAUDE.md: "There is no test runner"). Ya existen los agentes `playwright-test-planner`, `-generator` y `-healer`, y los comandos `/test-seed`, `/test-planner`, `/test-generator` y `/test-healer` en `.claude/`, que esperan `tests/seed.spec.ts`, `BASE_URL`, `APP_USER` y `APP_PASSWORD` en `.env`, y planes en `specs/`.

El responsable decidió correr las pruebas **contra la API desplegada en Railway (hoy, producción)**, con un usuario de Supabase real, sin simular la API. Eso prueba la integración completa, pero los errores del servidor (`409`, `502` y `503`) no se pueden forzar y las pruebas dependen de datos sembrados en ese entorno.

`/checkout` está protegido por `proxy.ts`, que valida la sesión de Supabase en servidor, así que las pruebas necesitan una sesión de verdad.

## Goals

- `@playwright/test` como devDependency, con `playwright.config.ts` y el script `pnpm test:e2e`.
- Una sesión autenticada reutilizable (`storageState`) creada una vez por corrida a partir de `APP_USER` y `APP_PASSWORD`.
- Ayudantes que preparan y limpian datos directamente en la API (carrito y direcciones) con el token del usuario de prueba, para que cada prueba arranque de un estado conocido.
- Una suite que cubre el flujo feliz, la validación del formulario, el comportamiento del acordeón, la receta y la redirección a Mercado Pago, en escritorio y en móvil.
- Un plan de pruebas en `specs/plan-e2e-checkout.md` (formato de `playwright-test-planner`).

## Non-goals

- Correr la suite en CI: necesita credenciales y la API de desarrollo. Queda para otro spec.
- Simular la API con `page.route`, salvo `POST /v1/checkout` (escenario 16) y la carga de Mercado Pago.
- Pagar de verdad en Mercado Pago (sandbox incluido) o probar el webhook y `/checkout/resultado`.
- Pruebas de errores del servidor que no se pueden provocar contra la API real (`409` por existencias, `502`, `503`).
- Auditoría automática de accesibilidad (axe): sería otra dependencia.
- Pruebas unitarias o de componentes.
- E2E del resto del sitio (catálogo, ficha, cuenta).

## Dependencies

- SPEC 19: la suite valida su UI y usa sus roles y nombres accesibles como selectores.
- Externa: la API de Railway (`NEXT_PUBLIC_API_URL`, hoy producción), Supabase con el usuario de `.env` (`APP_USER`), armazón `karl-lagerfeld-kl6241`, lentes `biofinity` y CORS de la API que permita `http://localhost:3000` (ya resuelto en una sesión anterior).

## Functional requirements

### Configuración

1. `pnpm add -D @playwright/test`; `pnpm exec playwright install chromium` se documenta, no se automatiza.
2. `playwright.config.ts`:
   - `testDir: "tests"`, `baseURL: process.env.BASE_URL ?? "http://localhost:3000"`.
   - `webServer: { command: "pnpm dev", url: baseURL, reuseExistingServer: true }`.
   - Proyectos: `setup` (login), `chromium` (Desktop Chrome) y `mobile` (Pixel 7), los dos últimos con `dependencies: ["setup"]` y `storageState: "playwright/.auth/user.json"`.
   - `fullyParallel: false` y `workers: 1`: todas las pruebas comparten el mismo usuario y el mismo carrito.
   - `trace: "retain-on-failure"`, `video: "retain-on-failure"` y `screenshot: "only-on-failure"`.
   - Lee `.env` con `process.loadEnvFile` (Node 22), sin `dotenv`.
3. `.gitignore`: `playwright/.auth/`, `test-results/`, `playwright-report/`.
4. `package.json`: `"test:e2e": "playwright test"`.
5. `.env.example`: se agregan `BASE_URL`, `APP_USER`, `APP_PASSWORD`, `E2E_FRAME_SLUG` y `E2E_LENS_SLUG`, vacíos.

### Sesión

6. `tests/auth.setup.ts` inicia sesión por la UI en `/login` con `APP_USER` y `APP_PASSWORD`, confirma el menú de cuenta y guarda `storageState`. Si faltan las variables, falla con un mensaje claro.
7. `tests/seed.spec.ts` sigue el formato que esperan los agentes (`test.describe("Test group")` y test `seed`): abre `/checkout` ya autenticado y confirma el título.

### Ayudantes de datos (`tests/support/api.ts`)

8. Obtiene un token con `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` (`apikey` igual a la publishable key) y llama a la API con `Authorization: Bearer`.
9. `emptyCart()`: borra todos los artículos (`DELETE /v1/cart/items/{id}`).
10. `addToCart(slug, opts)`: resuelve la variante con `GET /v1/products/{slug}` y la agrega con `POST /v1/cart/items`. En armazones usa la necesidad "Solo armazón" (sin receta).
11. `deleteAddressesExcept(ids)`: borra las direcciones que crearon las pruebas, para que el usuario conserve solo las que tenía.
12. Cada prueba deja el carrito vacío y borra las direcciones que creó (`afterEach`).

### Escenarios (`tests/checkout/*.spec.ts`)

13. **Acceso:** sin sesión (contexto sin `storageState`), `/checkout` redirige a `/login?next=%2Fcheckout`.
14. **Carrito vacío:** muestra el estado vacío y los botones "Ver armazones" y "Ver lentes de contacto" llevan a sus rutas.
15. **Flujo feliz con armazón sin receta:** con carrito `E2E_FRAME_SLUG` y dirección predeterminada, abre en Pago; Dirección aparece completada; no hay paso Receta; el resumen muestra el producto y el subtotal.
16. **Redirección a Mercado Pago:** `POST /v1/checkout` se intercepta con `page.route` y **nunca llega a la API**: la prueba verifica el cuerpo (`address_id` y recetas) y responde `201` con un `init_point` ficticio de `https://www.mercadopago.com.mx/…`. Las peticiones a `*.mercadopago.com*` se bloquean (`route.abort`). La prueba confirma que se intentó navegar a esa URL, que el botón muestra "Redirigiendo…" y que no admite un segundo clic. Una segunda variante responde `409` con `detail` y confirma el mensaje en el paso Pago.
17. **Validación de dirección:** sin direcciones, el formulario aparece abierto. Enviarlo vacío marca los campos requeridos. CP `0600` y teléfono `555555555` muestran los errores de 5 y 10 dígitos. Datos válidos guardan, la dirección queda elegida y avanza el paso.
18. **Acordeón:** "Cambiar" en Dirección la abre, cierra Pago y mueve el foco; un paso pendiente no se abre; `aria-current="step"` sigue al paso abierto; "Agregar otra dirección" y luego "Cancelar" regresan a la lista.
19. **Receta de lentes de contacto:** con carrito `E2E_LENS_SLUG`, aparece el paso Receta. Si el usuario tiene una receta aprobada, viene preseleccionada y "Continuar" avanza a Pago. Si la cuenta no tiene una receta aprobada, la prueba se marca `test.skip` con el motivo.
20. **Móvil:** en el proyecto `mobile`, el resumen es un `<details>` cerrado que muestra el subtotal y se expande con un toque; no hay scroll horizontal (`scrollWidth <= clientWidth`).

### Selectores

21. Solo `getByRole`, `getByLabel` y `getByText` sobre los textos de `messages/es-MX.json`, sin selectores CSS ni `data-testid`, salvo que SPEC 19 no dé un nombre accesible único.

## Interfaces & contracts

Archivos nuevos: `playwright.config.ts`, `tests/auth.setup.ts`, `tests/seed.spec.ts`, `tests/support/api.ts`, `tests/checkout/*.spec.ts` y `specs/plan-e2e-checkout.md`. Archivos que cambian: `package.json`, `pnpm-lock.yaml`, `.gitignore`, `.env.example`, `eslint.config.*` si hace falta ignorar `playwright-report/`, y `CLAUDE.md` (se reemplaza "There is no test runner" por el comando `pnpm test:e2e` y sus requisitos).

Variables de entorno (solo pruebas, nunca `NEXT_PUBLIC_*`): `BASE_URL`, `APP_USER`, `APP_PASSWORD`, `E2E_FRAME_SLUG` y `E2E_LENS_SLUG`. Los ayudantes reutilizan `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de `.env`.

API usada por los ayudantes, sin cambios de contrato: `GET /v1/cart`, `POST /v1/cart/items`, `DELETE /v1/cart/items/{id}`, `GET`/`DELETE /v1/me/addresses` y `GET /v1/products/{slug}`.

## Non-functional requirements

- La suite completa corre en menos de 3 minutos en local contra Railway.
- Las credenciales solo viven en `.env`, ya ignorado por git. `storageState` va en `playwright/.auth/`, también ignorado.
- `tsc --noEmit` cubre `tests/` y `playwright.config.ts`, y la suite pasa `pnpm lint`.

## Edge cases

- Faltan `APP_USER` o `APP_PASSWORD`: `auth.setup` falla con "Define APP_USER y APP_PASSWORD en .env".
- Falta `E2E_LENS_SLUG`: la prueba de receta se marca `test.skip` con el motivo, sin fallar la suite.
- La API de desarrollo no responde: la prueba falla en el ayudante con el estado HTTP, no por un timeout de UI.
- El producto de prueba se queda sin existencias: `addToCart` falla con el `detail` de la API.
- Corrida interrumpida que deja direcciones o carrito sucios: la siguiente corrida limpia el carrito al inicio; las direcciones con destinatario que empieza por `E2E ` se borran en `beforeAll`.
- La suite nunca envía `POST /v1/checkout` a la API, así que no crea pedidos, preferencias de Mercado Pago ni apartados.

## Acceptance criteria

- [ ] `pnpm test:e2e` corre los proyectos `setup`, `chromium` y `mobile`, y pasa contra la API de Railway con un `.env` completo.
- [ ] Los escenarios 13 a 20 existen y pasan, o se saltan con motivo explícito cuando falta su variable.
- [ ] Al terminar, el usuario de prueba queda con el carrito vacío y las mismas direcciones que tenía antes.
- [ ] Ninguna prueba carga la página de Mercado Pago (la petición se bloquea) y ninguna paga.
- [ ] `tests/seed.spec.ts` funciona con `/test-planner` y `specs/plan-e2e-checkout.md` existe.
- [ ] `pnpm lint` y `pnpm typecheck` pasan con los archivos nuevos.
- [ ] CLAUDE.md documenta `pnpm test:e2e` y sus variables.

## Risks

- Inestabilidad por depender de la red y de datos de Railway; se mitiga con un solo worker, limpieza antes y después, y mensajes de error desde los ayudantes.
- La suite corre contra **producción** (`lentes-api-production`, la única API desplegada) con la cuenta real del responsable, por decisión del 2026-11-18. Por eso no se envía el checkout real, y el perfil y las direcciones se restauran o limpian al terminar. Un fallo a mitad de corrida puede dejar direcciones `E2E …` hasta la siguiente corrida.
- Si el login cambia (SPEC 08 y SPEC 10), `auth.setup` se rompe; el `/test-healer` lo puede reparar.
