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
  mcp: load("mcp"),
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

const nativePlugins = ["eslint", "typescript", "unicorn", "oxc", "import", "promise", "node"];

function selectPresets(options) {
  const frontend = options.react || options.nextjs || options.reactPerf || options.shadcn;

  return [
    [options.typeAware, rules.typeAware, []],
    [options.sizeLimits, rules.sizeLimits, []],
    [options.mcp, rules.mcp, []],
    [frontend, rules.react, ["react", "jsx-a11y"]],
    [options.nextjs, rules.nextjs, ["nextjs"]],
    [options.reactPerf, rules.reactPerf, ["react-perf"]],
    [options.vitest, rules.vitest, ["vitest"]],
    [options.tailwind, rules.tailwind, []],
    [options.shadcn, rules.shadcn, []],
  ].filter(([enabled]) => enabled);
}

function customPlugins(options) {
  const plugins = [
    { name: "anti-slop", specifier: require.resolve("@aranlucas/oxlint-plugin-anti-slop") },
  ];

  if (options.namedTypes) {
    plugins.push({
      name: "oxforge",
      specifier: fileURLToPath(new URL("../dist/plugin.js", import.meta.url)),
    });
  }

  if (options.tailwind) {
    plugins.push({ name: "tailwindcss", specifier: require.resolve("oxlint-tailwindcss") });
  }

  if (options.shadcn) {
    plugins.push({ name: "shadcn", specifier: require.resolve("@shadcn/lint") });
  }

  return plugins;
}

function selectedSettings(options, projectSettings) {
  const settings = { ...projectSettings };

  if (options.tailwind) {
    if (!options.tailwind.stylesheet) {
      throw new Error("Oxforge: tailwind.stylesheet must point to your Tailwind CSS entry point.");
    }

    settings.tailwindcss = {
      entryPoint: options.tailwind.stylesheet,
      ...options.tailwind.settings,
      ...projectSettings?.tailwindcss,
    };
  }

  if (options.shadcn) {
    settings.shadcn = { ...options.shadcn, ...projectSettings?.shadcn };
  }

  return settings;
}

function selectedRules(options, presets) {
  const selected = { ...rules.base, ...rules.antiSlop };

  for (const [, preset] of presets) {
    Object.assign(selected, preset);
  }

  if (options.namedTypes) {
    selected["oxforge/no-inline-types"] = "error";
  }

  if (options.allowTypeGuards) {
    selected["anti-slop/no-runtime-typeof"] = ["error", { allowInTypeGuards: true }];
  }

  return selected;
}

function separateOptions(input) {
  const {
    react = false,
    nextjs = false,
    reactPerf = false,
    vitest = false,
    typeAware = true,
    namedTypes = true,
    allowTypeGuards = false,
    pedantic = true,
    sizeLimits = false,
    tailwind = false,
    shadcn = false,
    mcp = false,
    ...project
  } = input;

  return [
    {
      react,
      nextjs,
      reactPerf,
      vitest,
      typeAware,
      namedTypes,
      allowTypeGuards,
      pedantic,
      sizeLimits,
      tailwind,
      shadcn,
      mcp,
    },
    project,
  ];
}

function composeConfig(options, project, presets) {
  const frontend = options.react || options.nextjs || options.reactPerf || options.shadcn;
  const env = { es2026: true };

  if (frontend) {
    env.browser = true;
  }

  return {
    ...project,
    plugins: [
      ...new Set([
        ...nativePlugins,
        ...presets.flatMap(([, , plugins]) => plugins),
        ...(project.plugins ?? []),
      ]),
    ],
    jsPlugins: [...customPlugins(options), ...(project.jsPlugins ?? [])],
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
      pedantic: options.pedantic ? "error" : "off",
      style: "off",
      restriction: "off",
      nursery: "off",
      ...project.categories,
    },
    env: { ...env, ...project.env },
    options: {
      typeAware: options.typeAware,
      maxWarnings: 0,
      reportUnusedDisableDirectives: "error",
      ...project.options,
    },
    ignorePatterns: [...ignorePatterns, ...(project.ignorePatterns ?? [])],
    settings: selectedSettings(options, project.settings),
    rules: { ...selectedRules(options, presets), ...project.rules },
  };
}

/** Create a fresh config; project rules, settings, and overrides win. */
export function oxforge(input = {}) {
  const [options, project] = separateOptions(input);

  return structuredClone(composeConfig(options, project, selectPresets(options)));
}

export default oxforge;
