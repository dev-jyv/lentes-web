import { expect, test } from "@playwright/test";
import { addFrameAnonymous, emptyCart, getCart } from "../support/api";

// SPEC 26: el carrito anónimo se une a la cuenta en cualquier inicio de sesión. El carrito original
// de la cuenta lo restaura el proyecto teardown.
test.use({ storageState: { cookies: [], origins: [] } });

test("al iniciar sesión, el carrito anónimo pasa a la cuenta", async ({ page, context, baseURL }) => {
  const slug = process.env.E2E_FRAME_SLUG;
  test.skip(!slug, "Define E2E_FRAME_SLUG");
  await emptyCart();
  const token = await addFrameAnonymous(slug!);
  await context.addCookies([{ name: "cart_token", value: token, url: baseURL! }]);

  await page.goto("/login?next=%2Fcuenta");
  const form = page.getByRole("main");
  await form.getByLabel("Correo").fill(process.env.APP_USER!);
  await form.getByRole("textbox", { name: "Contraseña" }).fill(process.env.APP_PASSWORD!);
  await form.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.waitForURL("**/cuenta");

  await expect.poll(async () => (await getCart()).items.map((i) => i.product.slug), { timeout: 15_000 }).toContain(slug);
  await expect.poll(async () => (await context.cookies()).some((c) => c.name === "cart_token")).toBe(false);
});
