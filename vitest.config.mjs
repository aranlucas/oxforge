import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/**/*.test.mjs"],
          exclude: ["test/package.test.mjs", "test/package-process.test.mjs"],
          environment: "node",
          // Preserve the existing CLI test deadlines.
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        test: {
          name: "package",
          include: ["test/package.test.mjs", "test/package-process.test.mjs"],
          environment: "node",
          // Scoped integration envelope; commands still share a 240s deadline.
          testTimeout: 240_000,
          hookTimeout: 240_000,
        },
      },
    ],
  },
});
