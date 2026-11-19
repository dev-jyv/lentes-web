import { expect, test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";
import { backupAccount, signInTestUser } from "./support/api";

// La sesión se crea por API y se inyecta como cookies: el formulario de login tiene Turnstile, que no se puede
// resolver en un navegador automatizado.
setup("respalda la cuenta e inicia sesión", async ({ page, baseURL }) => {
  await backupAccount();

  const { cookies } = await signInTestUser();
  await page.context().addCookies(cookies.map((c) => ({ ...c, url: baseURL! })));
  await page.goto("/cuenta");
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});
