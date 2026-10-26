import { defineConfig } from "orval";

export default defineConfig({
  lentes: {
    input: "./openapi/openapi.yaml",
    output: {
      mode: "tags-split",
      target: "./lib/api/generated",
      schemas: "./lib/api/generated/model",
      client: "react-query",
      clean: true,
      override: {
        mutator: { path: "./lib/api/mutator.ts", name: "apiFetch" },
      },
    },
  },
});
