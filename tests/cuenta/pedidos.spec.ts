import { expect, test } from "@playwright/test";

// SPEC 22: lista y detalle de pedidos. Solo lectura.

test("la lista muestra tarjetas y el filtro vive en ?estado=", async ({ page }) => {
  await page.goto("/cuenta/pedidos");
  await expect(page.getByRole("heading", { level: 1, name: "Mis pedidos" })).toBeVisible();
  const filters = page.getByRole("group", { name: "Filtrar pedidos" });
  const empty = page.getByText("Aún no tienes pedidos.");
  await expect(filters.or(empty)).toBeVisible();
  if (await empty.isVisible()) {
    test.skip(true, "La cuenta de prueba no tiene pedidos");
  }
  await expect(filters.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");

  await filters.getByRole("button", { name: "Entregados" }).click();
  await expect(page).toHaveURL(/\?estado=entregados$/);
  await expect(filters.getByRole("button", { name: "Entregados" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(filters.getByRole("button", { name: "Entregados" })).toHaveAttribute("aria-pressed", "true");
  const cards = page.getByRole("link", { name: "Ver detalle" });
  if (await cards.count()) await expect(page.getByRole("listitem").filter({ has: cards.first() }).first()).toContainText("Entregado");

  await filters.getByRole("button", { name: "Todos" }).click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
});

test("abre el detalle del primer pedido y regresa", async ({ page }) => {
  await page.goto("/cuenta/pedidos");
  const detail = page.getByRole("link", { name: "Ver detalle" }).first();
  const empty = page.getByText("Aún no tienes pedidos.");
  await expect(detail.or(empty)).toBeVisible();
  test.skip(await empty.isVisible(), "La cuenta de prueba no tiene pedidos");
  await detail.click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Pedido LC-\d{6}$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Artículos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Importes" })).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  // Línea de avance o aviso, según el estado.
  await expect(page.getByRole("list", { name: "Avance del pedido" }).or(page.getByText(/Este pedido|El tiempo para pagar/))).toBeVisible();

  await page.getByRole("link", { name: "Mis pedidos" }).first().click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
});

test("un pedido inexistente muestra no encontrado", async ({ page }) => {
  await page.goto("/cuenta/pedidos/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("No encontramos este pedido.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mis pedidos" }).first()).toHaveAttribute("href", "/cuenta/pedidos");
});
