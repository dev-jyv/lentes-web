import { expect, test } from "@playwright/test";
import { signInTestUser } from "../support/api";

// Recuperar contraseña manda el token de Turnstile (Supabase lo exige). La respuesta de Supabase se simula.
test.use({ storageState: { cookies: [], origins: [] } });

async function submit(page: import("@playwright/test").Page) {
  await page.goto("/recuperar");
  await page.getByRole("main").getByLabel("Correo").fill("alguien@correo.mx");
  await page.getByRole("main").getByRole("button", { name: "Enviar enlace" }).click();
}

test("muestra la respuesta neutra al enviar el enlace", async ({ page }) => {
  await page.route("**/auth/v1/recover**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await submit(page);
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Si el correo existe, te enviamos un enlace para restablecer tu contraseña.");
});

test("si Supabase rechaza el captcha, pide completar la verificación", async ({ page }) => {
  await page.route("**/auth/v1/recover**", (r) => r.fulfill({ status: 400, contentType: "application/json",
    body: JSON.stringify({ code: 400, error_code: "captcha_failed", msg: "captcha protection: request disallowed" }) }));
  await submit(page);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Completa la verificación.");
});

// El enlace del correo abre sesión y lleva a /cuenta/contrasena. La sesión sale de un enlace de recuperación real
// (API de administración); el envío del correo no se automatiza porque el formulario exige Turnstile.
// Guardar la contraseña se simula: la cuenta de prueba es real y su contraseña no debe cambiar.
test("con el enlace de recuperación se guarda una contraseña nueva", async ({ page, baseURL }) => {
  test.skip(!process.env.SUPABASE_SECRET_KEY, "Define SUPABASE_SECRET_KEY");
  const { session, cookies } = await signInTestUser("recovery");
  await page.context().addCookies(cookies.map((c) => ({ ...c, url: baseURL! })));
  let sent: { password?: string } | undefined;
  await page.route("**/auth/v1/user**", (r) => {
    if (r.request().method() !== "PUT") return r.continue();
    sent = r.request().postDataJSON();
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session.user) });
  });

  await page.goto("/cuenta/contrasena");
  await expect(page.getByRole("heading", { name: "Nueva contraseña" })).toBeVisible();
  await page.getByRole("main").getByLabel("Nueva contraseña").fill("Lentes-Prueba-2026!");
  await page.getByRole("main").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  expect(sent?.password).toBe("Lentes-Prueba-2026!");
});

test("sin sesión, /cuenta/contrasena pide iniciar sesión", async ({ page }) => {
  await page.goto("/cuenta/contrasena");
  await expect(page).toHaveURL(/\/login\?next=%2Fcuenta%2Fcontrasena$/);
});
