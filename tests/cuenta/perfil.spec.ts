import { expect, test } from "@playwright/test";
import { getMe, updateMe } from "../support/api";

// SPEC 21: panel de cuenta y datos personales. El perfil original se restaura al terminar.
test.describe.configure({ mode: "serial" });

let original: Awaited<ReturnType<typeof getMe>>;
test.beforeAll(async () => {
  original = await getMe();
});
test.afterAll(async () => {
  await updateMe({ full_name: original.full_name ?? null, phone: original.phone ?? null, marketing_opt_in: original.marketing_opt_in });
});

const sections = ["Resumen", "Datos personales", "Direcciones", "Pedidos", "Recetas", "Favoritos"];

test("el panel muestra la navegación con la sección activa", async ({ page }) => {
  await page.goto("/cuenta");
  const nav = page.getByRole("navigation", { name: "Mi cuenta" }).last();
  for (const s of sections) await expect(nav.getByRole("link", { name: s, exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Resumen", exact: true })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Direcciones", exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta\/direcciones$/);
  await expect(nav.getByRole("link", { name: "Direcciones", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1, name: "Direcciones" })).toBeVisible();
  // La barra de secciones se desliza sola en móvil; la página no.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("el resumen muestra el último pedido y los accesos", async ({ page }) => {
  await page.goto("/cuenta");
  await expect(page.getByRole("heading", { name: "Último pedido" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Datos personales/ }).last()).toBeVisible();
  await expect(page.getByRole("link", { name: /Direcciones/ }).last()).toBeVisible();
});

test("/cuenta/contrasena no usa el panel", async ({ page }) => {
  await page.goto("/cuenta/contrasena");
  await expect(page.getByRole("navigation", { name: "Mi cuenta" })).toHaveCount(0);
});

test("edita nombre y teléfono, valida y persiste", async ({ page }) => {
  await page.goto("/cuenta/perfil");
  const name = page.getByLabel("Nombre completo");
  const phone = page.getByLabel("Teléfono (opcional, 10 dígitos)");
  const save = page.getByRole("button", { name: "Guardar cambios" });
  await expect(name).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toHaveAttribute("readonly", "");
  await expect(save).toBeDisabled();

  await name.fill("E2E Cliente Prueba");
  await phone.fill("555555555");
  await save.click();
  await expect(page.getByText("10 dígitos", { exact: true })).toBeVisible();

  await phone.fill("5512345678");
  await save.click();
  await expect(page.getByText("Datos guardados")).toBeVisible();
  await expect(save).toBeDisabled();

  await page.reload();
  await expect(name).toHaveValue("E2E Cliente Prueba");
  await expect(phone).toHaveValue("5512345678");
});
