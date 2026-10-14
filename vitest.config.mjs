import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.mjs"],
    environment: "node",
    // These integration cases invoke native lint and format processes.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
