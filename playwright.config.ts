import { defineConfig, devices } from "@playwright/test";

// Variables de prueba en .env y las NEXT_PUBLIC_* de la app en .env.local; ninguna sobrescribe el entorno.
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {}
}

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
export const STORAGE_STATE = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "tests",
  // Todas las pruebas comparten el usuario y su carrito: una a la vez.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "teardown" },
    { name: "teardown", testMatch: /restore\.teardown\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testIgnore: /\.(setup|teardown)\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
      testIgnore: /\.(setup|teardown)\.ts/,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
