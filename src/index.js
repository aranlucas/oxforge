import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const load = (name) => require(`../rules/${name}.json`);

export const rules = Object.freeze({
  base: load("base"),
  antiSlop: load("anti-slop"),
  typeAware: load("type-aware"),
  react: load("react"),
  nextjs: load("nextjs"),
  reactPerf: load("react-perf"),
  vitest: load("vitest"),
  tailwind: load("tailwind"),
  shadcn: load("shadcn"),
  sizeLimits: load("size-limits"),
});

export const ignorePatterns = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
  "**/.expo/**",
  "**/.vercel/**",
  ...[
    "agent",
    "agents",
    "claude",
    "codex",
    "continue",
    "cursor",
    "gemini",
    "opencode",
    "pi",
    "roo",
    "windsurf",
  ].map((name) => `**/.${name}/**`),
];

/** Create a fresh config; project rules, settings, and overrides win. */
export function oxforge(options = {}) {
  const {
    react = false,
    nextjs = false,
    reactPerf = false,
    vitest = false,
    typeAware = true,
    namedTypes = true,
    allowTypeGuards = false,
    pedantic = false,
    sizeLimits = false,
    tailwind = false,
    shadcn = false,
    ...project
  } = options;

  const plugins = ["eslint", "typescript", "unicorn", "oxc", "import", "promise", "node"];

  const jsPlugins = [
    { name: "anti-slop", specifier: require.resolve("@aranlucas/oxlint-plugin-anti-slop") },
  ];

  const selectedRules = { ...rules.base, ...rules.antiSlop };
  const settings = {};

  if (namedTypes) {
    jsPlugins.push({
      name: "oxforge",
      specifier: fileURLToPath(new URL("../dist/plugin.js", import.meta.url)),
    });
    selectedRules["oxforge/no-inline-types"] = "error";
  }

  if (typeAware) {
    Object.assign(selectedRules, rules.typeAware);
  }

  if (allowTypeGuards) {
    selectedRules["anti-slop/no-runtime-typeof"] = ["error", { allowInTypeGuards: true }];
  }

  if (sizeLimits) {
    Object.assign(selectedRules, rules.sizeLimits);
  }

  if (react || nextjs || reactPerf || shadcn) {
    plugins.push("react", "jsx-a11y");
    Object.assign(selectedRules, rules.react);
  }

  if (nextjs) {
    plugins.push("nextjs");
    Object.assign(selectedRules, rules.nextjs);
  }

  if (reactPerf) {
    plugins.push("react-perf");
    Object.assign(selectedRules, rules.reactPerf);
  }

  if (vitest) {
    plugins.push("vitest");
    Object.assign(selectedRules, rules.vitest);
  }

  if (tailwind) {
    if (!tailwind.stylesheet) {
      throw new Error("Oxforge: tailwind.stylesheet must point to your Tailwind CSS entry point.");
    }

    jsPlugins.push({ name: "tailwindcss", specifier: require.resolve("oxlint-tailwindcss") });
    Object.assign(selectedRules, rules.tailwind);
    settings.tailwindcss = {
      entryPoint: tailwind.stylesheet,
      ...tailwind.settings,
      ...project.settings?.tailwindcss,
    };
  }

  if (shadcn) {
    jsPlugins.push({ name: "shadcn", specifier: require.resolve("@shadcn/lint") });
    Object.assign(selectedRules, rules.shadcn);
    settings.shadcn = { ...shadcn, ...project.settings?.shadcn };
  }

  const env = { es2026: true };

  if (react || nextjs || reactPerf || shadcn) {
    env.browser = true;
  }

  return structuredClone({
    ...project,
    plugins: [...new Set([...plugins, ...(project.plugins ?? [])])],
    jsPlugins: [...jsPlugins, ...(project.jsPlugins ?? [])],
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
      pedantic: pedantic ? "error" : "off",
      style: "off",
      restriction: "off",
      nursery: "off",
      ...project.categories,
    },
    env: { ...env, ...project.env },
    options: {
      typeAware,
      maxWarnings: 0,
      reportUnusedDisableDirectives: "error",
      ...project.options,
    },
    ignorePatterns: [...ignorePatterns, ...(project.ignorePatterns ?? [])],
    settings: { ...project.settings, ...settings },
    rules: { ...selectedRules, ...project.rules },
  });
}

export default oxforge;
