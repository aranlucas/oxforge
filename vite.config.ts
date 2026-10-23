import { defineConfig } from "vite-plus";
import config from "./src/format-config.js";

export default defineConfig({
  fmt: {
    ...config,
    ignorePatterns: [
      ...(config.ignorePatterns ?? []),
      "dist/**",
      "docs/projects.json",
      "CHANGELOG.md",
    ],
  },
  pack: {
    entry: { plugin: "src/plugin.ts" },
    format: "esm",
    platform: "node",
    fixedExtension: false,
    dts: true,
    clean: true,
    publint: true,
    tsconfig: "tsconfig.json",
  },
});
