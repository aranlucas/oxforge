import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/**/*.test.mjs"],
          exclude: ["test/package.test.mjs"],
          environment: "node",
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        test: {
          name: "package",
          include: ["test/package.test.mjs"],
          environment: "node",
          // prepack rebuilds dist; do not race checkout tests when running all projects.
          sequence: { groupOrder: 1 },
          testTimeout: 60_000,
          hookTimeout: 240_000,
        },
      },
    ],
  },
});
