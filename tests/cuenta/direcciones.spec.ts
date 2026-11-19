import { expect, test, type Page } from "@playwright/test";
import { cleanupAddresses, E2E_PREFIX } from "../support/api";

// SPEC 21: libreta de direcciones. Solo toca direcciones con prefijo "E2E "; la predeterminada original se restaura.
test.describe.configure({ mode: "serial" });
test.afterAll(async () => {
  await cleanupAddresses();
});

const RECIPIENT = `${E2E_PREFIX}Libreta`;
const card = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

async function fill(page: Page, recipient: string) {
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Nombre de quien recibe").fill(recipient);
  await sheet.getByLabel("Calle").fill("Insurgentes Sur");
  await sheet.getByLabel("No. exterior").fill("1602");
  await sheet.getByLabel("Colonia").fill("Crédito Constructor");
  await sheet.getByLabel("Ciudad").fill("CDMX");
  await sheet.getByLabel("Estado").fill("CDMX");
  await sheet.getByLabel("Código postal").fill("03940");
  await sheet.getByLabel("Teléfono (10 dígitos)").fill("5512345678");
  await sheet.getByLabel("Referencias de entrega").fill("Entre Barranca del Muerto y Río Mixcoac");
}

test("agrega, edita, hace predeterminada y elimina una dirección", async ({ page }) => {
  await page.goto("/cuenta/direcciones");
  await page.getByRole("button", { name: "Agregar dirección" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Nueva dirección" })).toBeVisible();

  await sheet.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(sheet.getByText("Requerido").first()).toBeVisible();

  await fill(page, RECIPIENT);
  await sheet.getByLabel("Usar como dirección predeterminada").uncheck();
  await sheet.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.getByText("Dirección guardada")).toBeVisible();
  await expect(card(page, RECIPIENT)).toBeVisible();

  await card(page, RECIPIENT).getByRole("button", { name: `Editar: ${RECIPIENT}` }).click();
  await expect(sheet.getByRole("heading", { name: "Editar dirección" })).toBeVisible();
  await expect(sheet.getByLabel("Calle")).toHaveValue("Insurgentes Sur");
  await sheet.getByLabel("No. exterior").fill("1700");
  // Las direcciones guardadas antes de SPEC 25 no traen referencias: al editarlas se piden.
  await sheet.getByLabel("Referencias de entrega").fill("Entre Barranca del Muerto y Río Mixcoac");
  await sheet.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(card(page, RECIPIENT)).toContainText("Insurgentes Sur 1700");

  const makeDefault = card(page, RECIPIENT).getByRole("button", { name: "Hacer predeterminada" });
  if (await makeDefault.isVisible()) {
    await makeDefault.click();
    await expect(card(page, RECIPIENT)).toContainText("Predeterminada");
  }

  await card(page, RECIPIENT).getByRole("button", { name: `Eliminar: ${RECIPIENT}` }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(`¿Eliminar la dirección de ${RECIPIENT}?`);
  await confirm.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText("Dirección eliminada")).toBeVisible();
  await expect(card(page, RECIPIENT)).toHaveCount(0);
});

test("cancelar el alta cierra el panel sin guardar", async ({ page }) => {
  await page.goto("/cuenta/direcciones");
  await page.getByRole("button", { name: "Agregar dirección" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
