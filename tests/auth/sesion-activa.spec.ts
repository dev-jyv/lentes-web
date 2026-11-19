import { expect, test } from "@playwright/test";

// Con sesión iniciada (storageState del setup), login y registro mandan al destino o a la cuenta.
test("con sesión, /login lleva a la cuenta", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/cuenta$/);
});

test("con sesión, /registro respeta next interno", async ({ page }) => {
  await page.goto("/registro?next=%2Fcuenta%2Fpedidos");
  await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
});

test("con sesión, un next externo o hacia login no sale ni se cicla", async ({ page }) => {
  await page.goto("/login?next=%2F%5Cevil.example");
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.goto("/registro?next=%2Flogin");
  await expect(page).toHaveURL(/\/cuenta$/);
});
