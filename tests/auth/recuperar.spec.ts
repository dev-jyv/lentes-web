import { expect, test } from "@playwright/test";

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
