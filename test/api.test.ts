import { defineConfig } from "oxlint";
import { defineConfig as defineFormatConfig } from "oxfmt";
import oxforge from "../src/index.js";
import format, { tailwindSortConfig } from "../src/format.js";
import formatConfig, {
  tailwindSortConfig as staticTailwindSortConfig,
} from "../src/format-config.js";

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
    sortTailwindcss: { stylesheet: "app/globals.css" },
  }),
);
defineFormatConfig(format({ sortTailwindcss: true }));
defineFormatConfig(format({ sortTailwindcss: false }));
defineFormatConfig(
  format({
    sortTailwindcss: {
      ...tailwindSortConfig,
      functions: [...tailwindSortConfig.functions, "customClasses"],
      attributes: [],
      config: "tailwind.config.js",
      preserveDuplicates: true,
      preserveWhitespace: true,
    },
  }),
);
defineFormatConfig({
  ...formatConfig,
  sortTailwindcss: { ...staticTailwindSortConfig, stylesheet: "src/app/index.css" },
});

import tailwindConfig, { formatTailwindConfig } from "../src/format-tailwind.js";

defineFormatConfig(tailwindConfig);
defineFormatConfig({
  ...formatTailwindConfig,
  sortTailwindcss: { ...formatTailwindConfig.sortTailwindcss, stylesheet: "src/app/index.css" },
});
