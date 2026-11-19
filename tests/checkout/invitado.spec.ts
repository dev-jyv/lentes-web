import { expect, test, type Page } from "@playwright/test";
import { addFrameAnonymous, addLensAnonymous } from "../support/api";

// SPEC 25: checkout como invitado. Sin sesión; el carrito anónimo es real (API) y las rutas de invitado de la API
// (checkout, subida de receta, pedido) y el catálogo de códigos postales se simulan con su contrato (SPEC 23 y 24).
test.use({ storageState: { cookies: [], origins: [] } });

const ORDER_ID = "0f0e0d0c-0b0a-4908-8706-050403020100";
const order = {
  id: ORDER_ID, number: 321, status: "paid", subtotal_cents: 120000, shipping_cents: 0, discount_cents: 0, total_cents: 120000,
  created_at: "2026-11-18T12:00:00Z", paid_at: "2026-11-18T12:05:00Z", tracking_carrier: null, tracking_number: null, items: [],
  shipping_address: { recipient: "Ana López", street: "Reforma", ext_number: "100", int_number: null, neighborhood: "Juárez",
    city: "Ciudad de México", state: "Ciudad de México", postal_code: "06600", phone: "5512345678", references: "Portón negro" },
};

async function mockGuestApi(page: Page, sent: { body?: Record<string, unknown> }) {
  await page.route("**/v1/postal-codes/*", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ postal_code: "06600", state: "Ciudad de México", municipality: "Cuauhtémoc", city: "Ciudad de México",
      neighborhoods: [{ name: "Juárez", type: "Colonia" }] }),
  }));
  await page.route("**/v1/checkout/guest", async (r) => {
    sent.body = r.request().postDataJSON();
    await r.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      order_id: ORDER_ID, number: 321, total_cents: 120000, order_token: "tok-123",
      init_point: `http://localhost:3000/pedido/${ORDER_ID}?t=tok-123`,
    }) });
  });
  await page.route("**/v1/guest/orders/*", (r) => r.request().headers()["x-order-token"] === "tok-123"
    ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(order) })
    : r.fulfill({ status: 404, contentType: "application/problem+json", body: JSON.stringify({ title: "Not Found", status: 404, detail: "pedido" }) }));
}

async function anonCart(page: Page, baseURL: string, token: string) {
  await page.context().addCookies([{ name: "cart_token", value: token, url: baseURL }]);
}

async function fillContact(page: Page) {
  await page.getByLabel("Correo electrónico").fill("invitada@correo.mx");
  await page.getByLabel("Nombre", { exact: true }).fill("Ana");
  await page.getByLabel("Apellidos").fill("López");
  await page.getByLabel("Teléfono celular (10 dígitos)").fill("5512345678");
  await page.getByRole("button", { name: "Continuar al envío" }).click();
}

async function fillAddress(page: Page) {
  await page.getByLabel("Código postal").fill("06600");
  await expect(page.getByText("Ciudad de México, Ciudad de México")).toBeVisible();
  await page.getByLabel("Calle").fill("Reforma");
  await page.getByLabel("No. exterior").fill("100");
  await page.getByLabel("Referencias de entrega").fill("Portón negro");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}

test.describe("con armazón (sin receta)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    test.skip(!process.env.E2E_FRAME_SLUG, "Define E2E_FRAME_SLUG");
    await anonCart(page, baseURL!, await addFrameAnonymous(process.env.E2E_FRAME_SLUG!));
  });

  test("compra como invitado de punta a punta y ofrece crear cuenta", async ({ page }) => {
    const sent: { body?: Record<string, unknown> } = {};
    await mockGuestApi(page, sent);
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Compra como invitado" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar como invitado" }).click();

    // Identificación valida antes de avanzar.
    await page.getByRole("button", { name: "Continuar al envío" }).click();
    await expect(page.getByText("Requerido").first()).toBeVisible();
    await fillContact(page);

    // Envío: el destinatario y el teléfono vienen de Identificación.
    await expect(page.getByLabel("Nombre de quien recibe")).toHaveValue("Ana López");
    await expect(page.getByLabel("Teléfono (10 dígitos)")).toHaveValue("5512345678");
    await fillAddress(page);

    const pago = page.locator("#step-payment-header");
    await expect(pago).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#step-contact-header")).toContainText("Cambiar");
    await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();

    await page.waitForURL(`**/pedido/${ORDER_ID}?t=tok-123`);
    expect(sent.body).toMatchObject({
      contact: { email: "invitada@correo.mx", first_name: "Ana", last_name: "López", phone: "5512345678" },
      address: { postal_code: "06600", neighborhood: "Juárez", state: "Ciudad de México", references: "Portón negro", recipient: "Ana López" },
      prescription_upload: null,
    });
    await expect(page.getByRole("heading", { name: /Pedido/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Envío a" })).toContainText("Portón negro");
    const cta = page.getByRole("link", { name: "Crear mi cuenta" });
    await expect(cta).toHaveAttribute("href", "/registro?email=invitada%40correo.mx");
    await cta.click();
    await expect(page.getByLabel("Correo*")).toHaveValue("invitada@correo.mx");
  });

  test("recargar conserva Identificación y Envío en la misma pestaña", async ({ page }) => {
    await mockGuestApi(page, {});
    await page.goto("/checkout");
    await page.getByRole("button", { name: "Continuar como invitado" }).click();
    await fillContact(page);
    await page.reload();
    // Vuelve directo a sus pasos, con Identificación completa.
    await expect(page.locator("#step-contact-header")).toContainText("Cambiar");
    await expect(page.locator("#step-address-header")).toHaveAttribute("aria-expanded", "true");
  });

  test("Iniciar sesión muestra el acceso en línea", async ({ page }) => {
    await page.goto("/checkout");
    await page.getByRole("main").getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByRole("main").getByRole("textbox", { name: "Contraseña" })).toBeVisible();
  });
});

test("con lentes de contacto pide la receta antes de pagar", async ({ page, baseURL }) => {
  test.skip(!process.env.E2E_LENS_SLUG, "Define E2E_LENS_SLUG");
  await anonCart(page, baseURL!, await addLensAnonymous(process.env.E2E_LENS_SLUG!));
  const sent: { body?: Record<string, unknown> } = {};
  await mockGuestApi(page, sent);
  // La subida simulada usa el origen de la API: la CSP solo permite conectar con orígenes conocidos (R2 en producción).
  const putUrl = `${process.env.NEXT_PUBLIC_API_URL}/__e2e_r2_put/x.pdf`;
  await page.route("**/v1/guest/prescriptions/upload-url", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ upload_url: putUrl, r2_key: "recetas/invitados/c/x.pdf", expires_in: 600 }),
  }));
  await page.route("**/__e2e_r2_put/**", (r) => r.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "PUT", "Access-Control-Allow-Headers": "Content-Type" } }));

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Continuar como invitado" }).click();
  await fillContact(page);
  await fillAddress(page);
  await expect(page.locator("#step-prescription-header")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeDisabled();
  await page.getByLabel("Foto o PDF de tu receta").setInputFiles({ name: "receta.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await expect(page.getByText("Receta lista: receta.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();
  await page.waitForURL(`**/pedido/${ORDER_ID}?t=tok-123`);
  expect(sent.body).toMatchObject({ prescription_upload: { r2_key: "recetas/invitados/c/x.pdf" } });
});

test("un enlace de pedido inválido muestra que no se encontró", async ({ page }) => {
  await mockGuestApi(page, {});
  await page.goto(`/pedido/${ORDER_ID}?t=otro`);
  await expect(page.getByRole("heading", { name: "No encontramos este pedido" })).toBeVisible();
});
