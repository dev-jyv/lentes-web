import { expect, test } from "@playwright/test";
import { addFrameAnonymous, emptyCart, getCart, signInTestUser } from "../support/api";

// SPEC 26: el carrito anónimo se une a la cuenta en cualquier inicio de sesión. El carrito original
// de la cuenta lo restaura el proyecto teardown.
test.use({ storageState: { cookies: [], origins: [] } });

test("al iniciar sesión, el carrito anónimo pasa a la cuenta", async ({ page, context, baseURL }) => {
  const slug = process.env.E2E_FRAME_SLUG;
  test.skip(!slug, "Define E2E_FRAME_SLUG");
  await emptyCart();
  const token = await addFrameAnonymous(slug!);
  await context.addCookies([{ name: "cart_token", value: token, url: baseURL! }]);

  // Supabase exige captcha al login con contraseña y Turnstile no se resuelve en un navegador automatizado:
  // la respuesta del token se sustituye por una sesión real creada por API. El formulario, el evento SIGNED_IN
  // y la unión del carrito corren igual.
  const { session } = await signInTestUser();
  await page.route("**/auth/v1/token?grant_type=password", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));

  await page.goto("/login?next=%2Fcuenta");
  const form = page.getByRole("main");
  await form.getByLabel("Correo").fill(process.env.APP_USER!);
  await form.getByRole("textbox", { name: "Contraseña" }).fill("no-se-usa");
  await form.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.waitForURL("**/cuenta");

  await expect.poll(async () => (await getCart()).items.map((i) => i.product.slug), { timeout: 15_000 }).toContain(slug);
  await expect.poll(async () => (await context.cookies()).some((c) => c.name === "cart_token")).toBe(false);
});
