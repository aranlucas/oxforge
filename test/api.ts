import { defineConfig } from "oxlint";
import { defineConfig as defineFormatConfig } from "oxfmt";
import oxforge from "../src/index.js";
import format from "../src/format.js";

defineConfig(
  oxforge({
    nextjs: true,
    tailwind: { stylesheet: "app/globals.css" },
    shadcn: { ui: "@/components/ui" },
    rules: { "no-console": "off" },
  }),
);
defineFormatConfig(
  format({
    printWidth: 80,
    sortTailwindcss: { stylesheet: "app/globals.css", functions: ["cn", "cva"] },
  }),
);
