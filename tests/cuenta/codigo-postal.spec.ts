import { expect, test } from "@playwright/test";

// SPEC 23: autocompletado por código postal en el formulario de dirección. La respuesta de la API se simula
// (mismo contrato que GET /v1/postal-codes/{cp}) para no depender del catálogo importado.
test.beforeEach(async ({ page }) => {
  await page.route("**/v1/postal-codes/*", (route) => {
    const cp = route.request().url().split("/").pop();
    if (cp !== "07200") {
      return route.fulfill({ status: 404, contentType: "application/problem+json", body: JSON.stringify({ title: "Not Found", status: 404, detail: "no encontramos ese código postal" }) });
    }
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        postal_code: "07200", state: "Ciudad de México", municipality: "Gustavo A. Madero", city: "Ciudad de México",
        neighborhoods: [{ name: "Cuautepec de Madero", type: "Colonia" }, { name: "Barrio Alto", type: "Barrio" }],
      }),
    });
  });
  await page.goto("/cuenta/direcciones");
  await page.getByRole("button", { name: "Agregar dirección" }).first().click();
});

test("un código conocido llena municipio y estado y ofrece las colonias", async ({ page }) => {
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Código postal").fill("07200");
  await expect(sheet.getByText("Ciudad de México, Ciudad de México")).toBeVisible();
  await expect(sheet.getByLabel("Estado")).toHaveCount(0);

  const colonia = sheet.getByLabel("Colonia");
  await expect(colonia.getByRole("option")).toHaveText(["Elige tu colonia", "Cuautepec de Madero (Colonia)", "Barrio Alto (Barrio)", "Otra colonia"]);
  await colonia.selectOption("Cuautepec de Madero");
  await expect(colonia).toHaveValue("Cuautepec de Madero");

  await colonia.selectOption({ label: "Otra colonia" });
  await expect(sheet.getByRole("textbox", { name: "Colonia" })).toBeVisible();

  await sheet.getByRole("button", { name: "Cambiar" }).click();
  await expect(sheet.getByLabel("Estado")).toHaveValue("Ciudad de México");
  await expect(sheet.getByLabel("Municipio o ciudad")).toHaveValue("Ciudad de México");
});

test("un código inexistente deja capturar todo a mano", async ({ page }) => {
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Código postal").fill("99999");
  await expect(sheet.getByText("No encontramos ese código postal; escribe tu dirección.")).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: "Colonia" })).toBeEditable();
  await expect(sheet.getByLabel("Estado")).toBeEditable();
  await expect(sheet.getByRole("link", { name: "No sé mi código postal" })).toHaveAttribute("target", "_blank");
});
