import { defineConfig } from "orval";

export default defineConfig({
  // Contrato: copia de lentes-api/api/openapi.yaml (fuente de verdad). `pnpm api:sync` la actualiza.
  lentes: {
    input: "./openapi/openapi.yaml",
    output: {
      mode: "single",
      target: "./lib/api/generated/api.ts",
      schemas: "./lib/api/generated/model",
      client: "react-query",
      clean: true,
      override: { mutator: { path: "./lib/api/mutator.ts", name: "apiFetch" } },
    },
  },
});
