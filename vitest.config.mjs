import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.mjs"],
    // Packaging installs a fresh consumer and runs separately via pnpm test:package.
    exclude: ["test/package.test.mjs"],
    environment: "node",
    // These integration cases invoke native lint and format processes.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
