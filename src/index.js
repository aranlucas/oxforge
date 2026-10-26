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
  maintainability: load("maintainability"),
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

const featureDefaults = {
  react: false,
  nextjs: false,
  reactPerf: false,
  vitest: false,
  typeAware: true,
  namedTypes: true,
  allowTypeGuards: false,
  pedantic: true,
  sizeLimits: false,
  maintainability: false,
  tailwind: false,
  shadcn: false,
};

const presetPlugins = {
  react: ["react", "jsx-a11y"],
  nextjs: ["nextjs"],
  reactPerf: ["react-perf"],
  vitest: ["vitest"],
};

/** Preserve destructuring defaults: only undefined selects a feature's default. */
function splitOptions(options) {
  const features = {};
  const project = { ...options };

  for (const [name, fallback] of Object.entries(featureDefaults)) {
    const value = options[name];
    features[name] = value === undefined ? fallback : value;
    delete project[name];
  }

  return { features, project };
}

/** Order matters: framework-specific rules override their shared prerequisites. */
function selectedPresets(features, usesReact) {
  const selection = {
    typeAware: features.typeAware,
    sizeLimits: features.sizeLimits,
    maintainability: features.maintainability,
    react: usesReact,
    nextjs: features.nextjs,
    reactPerf: features.reactPerf,
    vitest: features.vitest,
    tailwind: features.tailwind,
    shadcn: features.shadcn,
  };

  return [
    "base",
    "antiSlop",
    ...Object.entries(selection).flatMap(([name, enabled]) => (enabled ? [name] : [])),
  ];
}

function selectedRules(presets, features) {
  const selected = Object.assign({}, ...presets.map((name) => rules[name]));

  if (features.namedTypes) {
    selected["oxforge/no-inline-types"] = "error";
  }

  if (features.allowTypeGuards) {
    selected["anti-slop/no-runtime-typeof"] = ["error", { allowInTypeGuards: true }];
  }

  return selected;
}

function customPlugins(features) {
  const plugins = [
    { name: "anti-slop", specifier: require.resolve("@aranlucas/oxlint-plugin-anti-slop") },
  ];

  if (features.namedTypes) {
    plugins.push({
      name: "oxforge",
      specifier: fileURLToPath(new URL("../dist/plugin.js", import.meta.url)),
    });
  }

  if (features.tailwind) {
    plugins.push({ name: "tailwindcss", specifier: require.resolve("oxlint-tailwindcss") });
  }

  if (features.shadcn) {
    plugins.push({ name: "shadcn", specifier: require.resolve("@shadcn/lint") });
  }

  return plugins;
}

function featureSettings(features, project) {
  const settings = { ...project.settings };

  if (features.tailwind) {
    if (!features.tailwind.stylesheet) {
      throw new Error("Oxforge: tailwind.stylesheet must point to your Tailwind CSS entry point.");
    }

    settings.tailwindcss = {
      entryPoint: features.tailwind.stylesheet,
      ...features.tailwind.settings,
      ...project.settings?.tailwindcss,
    };
  }

  if (features.shadcn) {
    settings.shadcn = { ...features.shadcn, ...project.settings?.shadcn };
  }

  return settings;
}

function testOverrides(enabled, project) {
  if (!enabled) {
    return {};
  }

  return {
    overrides: [
      {
        // Match consumer-relative paths, not an absolute parent directory named src.
        files: ["**/src/**"],
        rules: {
          "vitest/consistent-test-filename": project.rules?.["vitest/consistent-test-filename"] ?? [
            "error",
            { ...rules.vitest["vitest/consistent-test-filename"][1], pattern: "^$" },
          ],
        },
      },
      ...(project.overrides ?? []),
    ],
  };
}

/** Create a fresh config; project rules, settings, and overrides win. */
export function oxforge(options = {}) {
  const { features, project } = splitOptions(options);
  const usesReact = [features.react, features.nextjs, features.reactPerf, features.shadcn].some(
    Boolean,
  );
  const presets = selectedPresets(features, usesReact);
  const plugins = [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "promise",
    "node",
    ...presets.flatMap((name) => presetPlugins[name] ?? []),
  ];
  const settings = featureSettings(features, project);

  return structuredClone({
    ...project,
    plugins: [...new Set([...plugins, ...(project.plugins ?? [])])],
    jsPlugins: [...customPlugins(features), ...(project.jsPlugins ?? [])],
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
      pedantic: features.pedantic ? "error" : "off",
      style: "off",
      restriction: "off",
      nursery: "off",
      ...project.categories,
    },
    env: { es2026: true, ...(usesReact ? { browser: true } : {}), ...project.env },
    options: {
      typeAware: features.typeAware,
      maxWarnings: 0,
      reportUnusedDisableDirectives: "error",
      ...project.options,
    },
    ignorePatterns: [...ignorePatterns, ...(project.ignorePatterns ?? [])],
    settings,
    rules: { ...selectedRules(presets, features), ...project.rules },
    ...testOverrides(features.vitest, project),
  });
}

export default oxforge;
