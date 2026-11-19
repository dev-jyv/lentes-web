import { expect, test } from "@playwright/test";

// SPEC 26: salida hacia Google y error del callback. El viaje real a Google es prueba manual (docs/GOOGLE-AUTH.md).
test.use({ storageState: { cookies: [], origins: [] } });

test("Continuar con Google sale a Supabase con el callback y el destino", async ({ page, baseURL }) => {
  let authorize: URL | null = null;
  await page.route("**/auth/v1/authorize**", (route) => {
    authorize = new URL(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>google</p>" });
  });

  await page.goto("/login?next=%2Fcuenta%2Fpedidos");
  await page.getByRole("main").getByRole("button", { name: "Continuar con Google" }).click();
  await expect.poll(() => authorize).not.toBeNull();

  const url = authorize!;
  expect(url.searchParams.get("provider")).toBe("google");
  expect(url.searchParams.get("code_challenge")).toBeTruthy();
  const redirect = new URL(url.searchParams.get("redirect_to")!);
  expect(redirect.origin + redirect.pathname).toBe(`${baseURL}/auth/callback`);
  expect(redirect.searchParams.get("next")).toBe("/cuenta/pedidos");
});

test("si Google o el cliente cancelan, el callback vuelve a login con aviso", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied&error_description=cancelled");
  await expect(page).toHaveURL(/\/login\?error=callback$/);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("No pudimos completar el inicio de sesión. Intenta de nuevo.");
});

test("un next externo en el callback no sale de la tienda", async ({ page }) => {
  await page.goto("/auth/callback?code=invalido&next=https%3A%2F%2Fevil.example");
  await expect(page).toHaveURL(/\/login\?error=callback$/);
});
