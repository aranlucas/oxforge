# Oxforge

Lucas's opinionated [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) policy. Shared presets replace repeated rule lists; local configs keep app-specific exceptions.

Built on [@aranlucas/oxlint-plugin-anti-slop](https://github.com/aranlucas/oxlint-plugin-anti-slop), Lucas's published packaging fork of [Dillon Mulroy's anti-slop](https://github.com/dmmulroy/anti-slop). Oxforge enables its 18 generic rules and adds named types, native rules, framework presets, and shared formatting. See [provenance](NOTICE.md).

## Install

Requires Node 22.18+, Oxlint 1.88+ within v1, and Oxfmt 0.73+ within v0.

```sh
pnpm add -D @aranlucas/oxforge oxlint@^1.88.0 oxfmt@^0.74.0 oxlint-tsgolint@^7.0.2004
pnpm exec oxforge init
```

Use `--react` or `--next` for a frontend, `--vitest` for test rules, or `--no-type-aware` for a project without the checker. The initializer writes `.oxlintrc.json` and `oxfmt.config.ts` and refuses to overwrite existing configs. For an existing project, follow [migration](#migrate-an-existing-project).

Add scripts to `package.json`:

```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt --write",
    "format:check": "oxfmt --check"
  }
}
```

## Choose presets

In JSON configs, use file paths in `extends`. Install Oxforge in the package containing the config; for a workspace dependency at a parent level, adjust the relative path to that dependency's `node_modules`.

For Next.js and Vitest:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": [
    "./node_modules/@aranlucas/oxforge/configs/recommended.json",
    "./node_modules/@aranlucas/oxforge/configs/nextjs.json",
    "./node_modules/@aranlucas/oxforge/configs/vitest.json"
  ],
  "options": { "typeAware": true },
  "env": { "node": true },
  "ignorePatterns": ["**/dist/**", "**/build/**", "**/coverage/**", "**/.next/**"]
}
```

| Preset                 | Use for                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `base.json`            | Native and anti-slop rules, named types, strict categories, unused-disable checks.                                       |
| `recommended.json`     | Base plus type-aware safety. Set `options.typeAware: true` in the root and install `oxlint-tsgolint`.                    |
| `type-aware.json`      | Type-aware rules only, to compose with another baseline.                                                                 |
| `react.json`           | React, hooks, compiler rules, automatic JSX runtime, accessibility, browser globals.                                     |
| `nextjs.json`          | React plus Next.js.                                                                                                      |
| `react-perf.json`      | React plus checks against fresh JSX prop objects and functions.                                                          |
| `vitest.json`          | Valid assertions, test placement, no focused or disabled tests.                                                          |
| `tailwind.json`        | Strict design-token and utility rules.                                                                                   |
| `shadcn.json`          | Variants own appearance; callers own layout.                                                                             |
| `size-limits.json`     | 300-line files, 120-line functions, 16 imports; comments and blank lines excluded.                                       |
| `maintainability.json` | Opt-in classic cyclomatic complexity at most 9 and block nesting at most 3; see the [workflow](docs/maintainability.md). |

Presets declare their plugins and rules together; adding a plugin alone does not select the policy. Framework presets are additive; `recommended.json` includes no frontend framework. Install optional plugins before extending their presets:

```sh
pnpm add -D oxlint-tailwindcss@^1.16.0 @shadcn/lint@^0.2.1
```

Keep app-specific values in native config fields: `settings.tailwindcss.entryPoint` for the stylesheet, `settings.shadcn.ui` for UI imports, and `env.node` or `env.worker` for runtime globals. Local `rules`, `settings`, and file-specific `overrides` take precedence. Disable named types with `"oxforge/no-inline-types": "off"`, or pedantic checks with `"categories": { "pedantic": "off" }`.

Ignore patterns belong in the project config: inherited patterns resolve relative to the preset inside `node_modules`. The initializer writes standard ignores locally; hand-written configs should retain their existing exclusions.

### Programmatic configuration

For `oxlint.config.ts`, compose typed config objects:

```ts
import { defineConfig } from "oxlint";
import { oxforge } from "@aranlucas/oxforge";

export default defineConfig({
  extends: [oxforge({ nextjs: true, vitest: true, env: { node: true } })],
});
```

See [OxforgeOptions](src/index.d.ts) for feature switches and plugin settings. Project values win; plugin and ignore arrays are additive. JSON presets are generated from the same rule definitions.

## Formatting

Use the shared static config in `oxfmt.config.ts`:

```ts
export { default } from "@aranlucas/oxforge/format-config";
```

To keep local exceptions, spread the shared config:

```ts
import config from "@aranlucas/oxforge/format-config";

export default {
  ...config,
  printWidth: 80,
  sortTailwindcss: {
    stylesheet: "app/globals.css",
    functions: ["cn", "clsx", "cva", "twMerge", "twJoin"],
  },
  ignorePatterns: [...(config.ignorePatterns ?? []), "src/generated/**"],
};
```

Import sorting is opt-in. The [`format()` factory](src/format.d.ts) from `@aranlucas/oxforge/format` also accepts Oxfmt options and adds local ignore patterns to the shared ones.

## Migrate an existing project

1. Install Oxforge and the tools required by your selected presets.
2. Add presets to the existing `.oxlintrc.json` through `extends`. Keep differing rules, `settings`, `env`, `globals`, generated-file ignores, local plugins in `jsPlugins`, and file-specific overrides.
3. Replace the existing formatter config with `oxfmt.config.ts`, retaining local exceptions. Keep one lint and one format config per directory.
4. Run the consuming project's lint, formatting, type, test, and build checks. Review diagnostics before applying fixes.

Keep stricter local protection until a released shared version with equivalent behavior is installed and verified under the project's package-age and security policies. To recover from an incompatible upgrade, pin the previous working version and restore its lockfile. Oxforge source changes and releases do not update consumer dependencies.

Adoption boundaries that need review:

- Strict equality includes null boundaries; side-effect imports allow CSS only. Environment initialization imports need a justified local exception.
- `typescript/prefer-readonly-parameter-types` is disabled, including in the type-aware preset. For mutable SDK/framework boundaries, preserve the actual API contract rather than adding casts or changing I/O ordering to satisfy lint.
- React modules reject unrelated constant exports. Next.js adds its own export allowlist in [rules/nextjs.json](rules/nextjs.json); preserve any narrower local allowlist until separately reviewed.
- The Vitest preset requires unit tests in `test/` folders with a `.test` suffix. End-to-end tests may use an `e2e/` folder or an `.e2e` suffix. Test paths cannot contain a consumer-relative `src/` segment. Filename checks cannot identify arbitrary test code in helpers.
- `no-unused-vars` uses native defaults: named underscore-prefixed variables and parameters remain allowed; a bare `_` parameter is checked.

Nested Oxlint configs must explicitly extend their parent. Passing `--config` disables nested config discovery. Root-only `options.typeAware` and `options.typeCheck` belong in the root, not shared presets or nested configs.

See [policy rationale and migration provenance](docs/policy.md) for deliberate conflicts and legacy ESLint constraints, and the [roadmap](ROADMAP.md) for proposed adoption work.

## Develop and publish

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` builds, checks API types, lints, checks formatting, and runs checkout and installed-package tests. Use `pnpm test` during checkout development or `pnpm test:package` for package-boundary failures; the latter packs and installs a temporary consumer and does not publish.

Releases run automatically from `main`; see [releasing](docs/releasing.md) for commit semantics, publishing setup, and packaging constraints.

MIT licensed. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
