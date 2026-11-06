import { mkdir, writeFile } from "node:fs/promises";
import { oxforge, rules } from "../src/index.js";
import { format } from "oxfmt";
import { nativePresets } from "../src/presets.js";

await mkdir("configs", { recursive: true });

const base = oxforge({ typeAware: false });

delete base.options.typeAware;

delete base.ignorePatterns;

base.jsPlugins = [
  { name: "anti-slop", specifier: "@aranlucas/oxlint-plugin-anti-slop" },
  { name: "oxforge", specifier: "../dist/plugin.js" },
];

const configs = {
  base,
  recommended: { extends: ["./base.json", "./type-aware.json"] },
  "type-aware": { rules: rules.typeAware },
  react: { ...nativePresets.react, rules: rules.react },
  nextjs: { ...nativePresets.nextjs, rules: rules.nextjs },
  "react-perf": { ...nativePresets.reactPerf, rules: rules.reactPerf },
  vitest: {
    ...nativePresets.vitest,
    rules: rules.vitest,
    overrides: oxforge({ vitest: true, typeAware: false }).overrides,
  },
  tailwind: {
    jsPlugins: [{ name: "tailwindcss", specifier: "oxlint-tailwindcss" }],
    rules: rules.tailwind,
  },
  shadcn: { jsPlugins: [{ name: "shadcn", specifier: "@shadcn/lint" }], rules: rules.shadcn },
  "size-limits": { rules: rules.sizeLimits },
  maintainability: { rules: rules.maintainability },
};

await Promise.all(
  Object.entries(configs).map(async ([name, config]) => {
    const filename = `configs/${name}.json`;
    const result = await format(filename, JSON.stringify(config));

    if (result.errors.length) {
      throw new Error(`Cannot format generated preset: ${filename}`);
    }

    await writeFile(filename, result.code);
  }),
);
