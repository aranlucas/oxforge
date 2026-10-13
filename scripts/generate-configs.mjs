import { mkdir, writeFile } from "node:fs/promises";
import { oxforge, rules } from "../src/index.js";
import { format } from "oxfmt";

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
  react: { plugins: ["react", "jsx-a11y"], env: { browser: true }, rules: rules.react },
  nextjs: { extends: ["./react.json"], plugins: ["nextjs"], rules: rules.nextjs },
  "react-perf": { extends: ["./react.json"], plugins: ["react-perf"], rules: rules.reactPerf },
  vitest: { plugins: ["vitest"], rules: rules.vitest },
  tailwind: {
    jsPlugins: [{ name: "tailwindcss", specifier: "oxlint-tailwindcss" }],
    rules: rules.tailwind,
  },
  shadcn: { jsPlugins: [{ name: "shadcn", specifier: "@shadcn/lint" }], rules: rules.shadcn },
  "size-limits": { rules: rules.sizeLimits },
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
