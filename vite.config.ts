import { defineConfig } from "vite-plus";
import config from "./src/format-config.js";

export default defineConfig({
  fmt: {
    ...config,
    ignorePatterns: [...(config.ignorePatterns ?? []), "dist/**", "docs/projects.json"],
  },
  pack: {
    entry: {
      index: "src/index.js",
      format: "src/format.js",
      "format-config": "src/format-config.js",
      "format-tailwind": "src/format-tailwind.js",
      plugin: "src/plugin.ts",
    },
    format: "esm",
    platform: "node",
    fixedExtension: false,
    dts: true,
    clean: true,
    publint: true,
    tsconfig: "tsconfig.json",
    // The JS entries ship hand-written declarations; plugin.d.ts is generated.
    copy: [
      "src/index.d.ts",
      "src/format.d.ts",
      "src/format-config.d.ts",
      "src/format-tailwind.d.ts",
    ],
  },
});
