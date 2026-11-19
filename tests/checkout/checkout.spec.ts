import { expect, test, type Page } from "@playwright/test";
import { addFrame, addLens, cleanupAddresses, E2E_PREFIX, emptyCart, listAddresses } from "../support/api";

// SPEC 19 y SPEC 20. Corre contra la API real: POST /v1/checkout nunca llega a la API (se intercepta).
const FRAME = process.env.E2E_FRAME_SLUG;
const LENS = process.env.E2E_LENS_SLUG;
const MP_INIT_POINT = "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=e2e";

test.describe.configure({ mode: "serial" });
test.afterEach(async () => {
  await emptyCart();
  await cleanupAddresses();
});

const stepHeader = (page: Page, title: string) =>
  page.getByRole("button", { name: new RegExp(`^${title}`) }).and(page.locator("[aria-controls]"));
const payButton = (page: Page) => page.getByRole("button", { name: "Pagar con Mercado Pago" });

// Responde al checkout como la API (incluido el preflight CORS) sin crear pedidos reales.
async function fakeCheckout(page: Page, status: number, body: object) {
  const origin = new URL(page.url() === "about:blank" ? (process.env.BASE_URL ?? "http://localhost:3000") : page.url()).origin;
  const cors = {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type, x-cart-token",
    "access-control-allow-methods": "POST, OPTIONS",
  };
  const bodies: unknown[] = [];
  await page.route("**/v1/checkout", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    bodies.push(route.request().postDataJSON());
    // Una respuesta lenta deja ver el estado "Redirigiendo…" antes de salir a Mercado Pago.
    await new Promise((r) => setTimeout(r, 1_000));
    await route.fulfill({
      status,
      headers: { ...cors, "content-type": status === 201 ? "application/json" : "application/problem+json" },
      body: JSON.stringify(body),
    });
  });
  await page.route(/mercadopago\.com/, (route) => route.abort());
  return bodies;
}

test("sin sesión, /checkout redirige al login", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
  await context.close();
});

test("carrito vacío muestra el estado vacío con accesos al catálogo", async ({ page }) => {
  await emptyCart();
  await page.goto("/checkout");
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver armazones" })).toHaveAttribute("href", "/armazones");
  await expect(page.getByRole("link", { name: "Ver lentes de contacto" })).toHaveAttribute("href", "/lentes");
});

test.describe("con armazón sin receta", () => {
  test.skip(!FRAME, "Define E2E_FRAME_SLUG en .env");
  test.beforeEach(async () => {
    await emptyCart();
    await addFrame(FRAME!);
  });

  test("abre en Pago con la dirección completada y sin paso de receta", async ({ page, isMobile }) => {
    test.skip((await listAddresses()).length === 0, "La cuenta de prueba no tiene direcciones guardadas");
    await page.goto("/checkout");
    const steps = page.getByRole("list", { name: "Pasos" });
    await expect(steps.getByRole("listitem")).toHaveCount(2);
    await expect(steps.locator("[aria-current=step]")).toContainText("2");
    await expect(stepHeader(page, "Pago")).toHaveAttribute("aria-expanded", "true");
    await expect(stepHeader(page, "Dirección de envío")).toHaveAttribute("aria-expanded", "false");
    await expect(stepHeader(page, "Dirección de envío")).toContainText("Cambiar");
    await expect(stepHeader(page, "Receta")).toHaveCount(0);
    await expect(payButton(page)).toBeEnabled();
    if (!isMobile) {
      const summary = page.getByRole("complementary", { name: "Resumen" });
      await expect(summary.getByText("Subtotal")).toBeVisible();
      await expect(summary.getByRole("listitem")).toHaveCount(1);
    }
  });

  test("Pagar envía el checkout y redirige a Mercado Pago una sola vez", async ({ page }) => {
    await page.goto("/checkout");
    const bodies = await fakeCheckout(page, 201, { order_id: "e2e", number: 0, total_cents: 0, init_point: MP_INIT_POINT });
    const toMp = page.waitForRequest(/mercadopago\.com/);
    await payButton(page).click();
    const busy = page.getByRole("button", { name: "Redirigiendo…" });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await busy.click({ force: true });
    expect((await toMp).url()).toBe(MP_INIT_POINT);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ address_id: expect.any(String), prescription_id: null, glasses_prescription_id: null });
  });

  test("un 409 de la API se muestra en el paso Pago", async ({ page }) => {
    await page.goto("/checkout");
    await fakeCheckout(page, 409, { type: "about:blank", title: "Conflict", status: 409, detail: "E2E: ya no hay existencias." });
    await payButton(page).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("E2E: ya no hay existencias.");
    await expect(payButton(page)).toBeEnabled();
  });

  test("Cambiar reabre la dirección, mueve el foco y aria-current lo sigue", async ({ page }) => {
    await page.goto("/checkout");
    const address = stepHeader(page, "Dirección de envío");
    await address.click();
    await expect(address).toHaveAttribute("aria-expanded", "true");
    await expect(address).toBeFocused();
    await expect(stepHeader(page, "Pago")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("list", { name: "Pasos" }).locator("[aria-current=step]")).toContainText("1");

    await page.getByRole("button", { name: "Agregar otra dirección" }).click();
    await expect(page.getByLabel("Calle")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("radio").first()).toBeAttached();

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(stepHeader(page, "Pago")).toHaveAttribute("aria-expanded", "true");
    await expect(stepHeader(page, "Pago")).toBeFocused();
  });

  test("valida el formulario de dirección y guarda una nueva", async ({ page }) => {
    await page.goto("/checkout");
    if ((await listAddresses()).length > 0) {
      await stepHeader(page, "Dirección de envío").click();
      await page.getByRole("button", { name: "Agregar otra dirección" }).click();
    }
    const save = page.getByRole("button", { name: "Guardar dirección" });
    await save.click();
    await expect(page.getByText("Requerido").first()).toBeVisible();
    // SPEC 23: el código postal es el primer campo, así que recibe el foco.
    await expect(page.getByLabel("Código postal")).toBeFocused();

    await page.getByLabel("Nombre de quien recibe").fill(`${E2E_PREFIX}Checkout`);
    await page.getByLabel("Calle").fill("Av. Reforma");
    await page.getByLabel("No. exterior").fill("100");
    await page.getByLabel("Colonia").fill("Juárez");
    await page.getByLabel("Ciudad").fill("CDMX");
    await page.getByLabel("Estado").fill("CDMX");
    await page.getByLabel("Código postal").fill("0600");
    await page.getByLabel("Teléfono (10 dígitos)").fill("555555555");
    await save.click();
    await expect(page.getByText("5 dígitos", { exact: true })).toBeVisible();
    await expect(page.getByText("10 dígitos", { exact: true })).toBeVisible();

    await page.getByLabel("Código postal").fill("06600");
    await page.getByLabel("Teléfono (10 dígitos)").fill("5555555555");
    await save.click();
    await expect(stepHeader(page, "Pago")).toHaveAttribute("aria-expanded", "true");
    await expect(stepHeader(page, "Dirección de envío")).toContainText("Cambiar");
    await expect(page.getByText(`${E2E_PREFIX}Checkout`).first()).toBeVisible();
  });

  test("en móvil el resumen es colapsable y no hay scroll horizontal", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo en el proyecto mobile");
    await page.goto("/checkout");
    const toggle = page.locator("summary", { hasText: "Ver resumen" });
    await expect(toggle).toContainText("$");
    const details = page.locator("details", { has: toggle });
    await expect(details).not.toHaveAttribute("open");
    await toggle.click();
    await expect(details).toHaveAttribute("open");
    await expect(details.getByText("Subtotal")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("con lentes de contacto", () => {
  test.skip(!LENS, "Define E2E_LENS_SLUG en .env");

  test("pide receta y la preselecciona si la cuenta tiene una utilizable", async ({ page }) => {
    await emptyCart();
    await addLens(LENS!);
    await page.goto("/checkout");
    const rx = stepHeader(page, "Receta");
    await expect(rx).toBeVisible();
    await expect(page.getByRole("list", { name: "Pasos" }).getByRole("listitem")).toHaveCount(3);
    if (await page.getByText("Sube tu receta").isVisible()) {
      await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
      test.skip(true, "La cuenta de prueba no tiene una receta de lentes de contacto utilizable");
    }
    if ((await rx.getAttribute("aria-expanded")) === "false") await rx.click();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(stepHeader(page, "Pago")).toHaveAttribute("aria-expanded", "true");
    await expect(rx).toContainText("Cambiar");
  });
});
