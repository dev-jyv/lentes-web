import { expect, test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";
import { backupAccount } from "./support/api";

setup("respalda la cuenta e inicia sesión", async ({ page }) => {
  const user = process.env.APP_USER;
  const password = process.env.APP_PASSWORD;
  if (!user || !password) throw new Error("Define APP_USER y APP_PASSWORD en .env");

  await backupAccount();

  await page.goto("/login?next=%2Fcuenta");
  // El popover de login del header repite los campos: se usa el formulario principal.
  const form = page.getByRole("main");
  await form.getByLabel("Correo").fill(user);
  await form.getByRole("textbox", { name: "Contraseña" }).fill(password);
  await form.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.waitForURL("**/cuenta");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});
