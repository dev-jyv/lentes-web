import { defineConfig } from "orval";

const output = (dir: string) => ({
  mode: "single" as const,
  target: `./lib/api/${dir}/api.ts`,
  schemas: `./lib/api/${dir}/model`,
  client: "react-query" as const,
  clean: true,
  override: { mutator: { path: "./lib/api/mutator.ts", name: "apiFetch" } },
});

export default defineConfig({
  // Contrato real: copia de lentes-api/api/openapi.yaml. `pnpm api:sync` la actualiza.
  lentes: { input: "./openapi/openapi.yaml", output: output("generated") },
  // PROVISIONAL: lo que la API aún no publica. Se elimina al llegar los endpoints reales.
  provisional: { input: "./openapi/provisional/web-ops.yaml", output: output("provisional") },
});
