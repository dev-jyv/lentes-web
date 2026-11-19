import { test as teardown } from "@playwright/test";
import { restoreAccount } from "./support/api";

teardown("restaura carrito, direcciones y perfil de la cuenta de prueba", async () => {
  await restoreAccount();
});
