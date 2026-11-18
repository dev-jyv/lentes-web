import { expect, test } from "@playwright/test";

// Punto de partida para los agentes playwright-test-* (/test-planner, /test-generator): checkout con sesión iniciada.
test.describe("Test group", () => {
  test("seed", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1, name: "Finalizar compra" })).toBeVisible();
  });
});
