import { defineConfig } from "oxlint";
import { defineConfig as defineFormatConfig } from "oxfmt";
import oxforge from "@aranlucas/oxforge";
import format, { tailwindSortConfig } from "@aranlucas/oxforge/format";
import formatConfig, {
  tailwindSortConfig as staticTailwindSortConfig,
} from "@aranlucas/oxforge/format-config";

defineConfig(
  oxforge({
    nextjs: true,
    maintainability: true,
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

import tailwindConfig, { formatTailwindConfig } from "@aranlucas/oxforge/format-tailwind";

defineFormatConfig(tailwindConfig);
defineFormatConfig({
  ...formatTailwindConfig,
  sortTailwindcss: { ...formatTailwindConfig.sortTailwindcss, stylesheet: "src/app/index.css" },
});
