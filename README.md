# Oxforge

**Strict types. Readable code. No slop.**

Lucas's opinionated [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) policy, forged from the configs across his projects. Shared presets replace repeated rule lists; small local configs keep app-specific exceptions.

Built on [@aranlucas/oxlint-plugin-anti-slop](https://github.com/aranlucas/oxlint-plugin-anti-slop), Lucas's published packaging fork of [Dillon Mulroy's anti-slop](https://github.com/dmmulroy/anti-slop). All 18 generic anti-slop rules are enabled. Oxforge adds a named-types plugin, strict native rules, framework presets, and shared formatting. See [provenance](NOTICE.md).

## Install

Requires Node 22.18+ or 24+, Oxlint 1.88+ within v1, and Oxfmt 0.73 within v0.73.

```sh
pnpm add -D @aranlucas/oxforge oxlint@^1.88.0 oxfmt@^0.73.0 oxlint-tsgolint@^7.0.2004
pnpm exec oxforge init
```

Use `--react` or `--next` for a frontend, `--vitest` for test rules, or `--no-type-aware` for a project without the checker. The initializer generates a plain JSON lint config and a static formatter import. It refuses to overwrite existing configs.

`.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/@aranlucas/oxforge/configs/recommended.json"],
  "options": { "typeAware": true },
  "ignorePatterns": ["**/dist/**", "**/build/**", "**/coverage/**"]
}
```

`oxfmt.config.ts`:

```ts
export { default } from "@aranlucas/oxforge/format-config";
```

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

Oxlint and Oxfmt discover these files directly. Editors, CI, and the normal CLIs use the same policy.

### TypeScript config

With Oxlint's `oxlint.config.ts`, import the config object instead of pointing at JSON files. Package imports work there, and options are typed:

```ts
import { defineConfig } from "oxlint";
import { oxforge } from "@aranlucas/oxforge";

export default defineConfig({
  extends: [oxforge({ react: true, vitest: true })],
});
```

## Upgrading from 0.1.x

Version 0.2.0 is a compatibility-affecting policy update: stricter defaults can report errors in
code that passed 0.1.3. Dependencies declared as `^0.1.3` do not select 0.2.0 automatically.
See the [0.2.0 release candidate and migration notes](https://github.com/aranlucas/oxforge/blob/f273129/CHANGELOG.md#020-unreleased) before upgrading.
Preparing or merging this version does not publish it or update consumers. Keep existing local
protections until the released package passes the consuming project's package-age/security gates
and its lint, type, test, and build checks.

## Plugins and presets

Oxlint's `plugins` array selects built-in Rust plugins such as `eslint`, `typescript`, `unicorn`, and `react`. Third-party custom rules use `jsPlugins`; shared rule settings use `extends`. Adding a plugin alone does not select all of Oxforge's opinionated rule settings. The presets declare the required built-in and custom plugins for you. See [Oxlint's config reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference) and [JS plugin documentation](https://oxc.rs/docs/guide/usage/linter/js-plugins).

JSON `extends` accepts file paths, so the explicit `./node_modules/` path is required. Bare package names in JSON `extends` are not supported by Oxlint 1.88.0. Install Oxforge in the package containing the config; for a workspace dependency at a parent level, adjust the relative path to that dependency's `node_modules`.

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
  "env": { "node": true }
}
```

| Preset             | Policy                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `base.json`        | Native rules, all 18 anti-slop rules, named types, strict categories, unused-disable checks.                       |
| `recommended.json` | Base plus type-aware safety rules. Set `options.typeAware: true` in the root config and install `oxlint-tsgolint`. |
| `type-aware.json`  | Type-aware rules only, for composing with another baseline.                                                        |
| `react.json`       | React, hooks, compiler rules, automatic JSX runtime, accessibility, browser globals.                               |
| `nextjs.json`      | React plus Next.js.                                                                                                |
| `react-perf.json`  | React plus rules against fresh JSX prop objects and functions.                                                     |
| `vitest.json`      | Valid assertions; no focused or disabled tests.                                                                    |
| `tailwind.json`    | Strict design-token and utility rules; use gap instead of `space-x/y`.                                             |
| `shadcn.json`      | Variants own appearance; callers own layout.                                                                       |
| `size-limits.json` | 300-line files, 120-line functions, 16 imports; comments and blank lines excluded.                                 |

Ignore patterns belong in the project config: Oxlint resolves inherited patterns relative to the preset file inside `node_modules`. The initializer writes the standard patterns into `.oxlintrc.json`; hand-written configs should keep their existing ignores.

Framework presets are additive. `recommended.json` includes no frontend framework by itself. Pedantic rules are enabled by default; explicit rule settings take precedence. Opt out with `categories: { "pedantic": "off" }`.

Install optional plugins before extending their presets:

```sh
pnpm add -D oxlint-tailwindcss@^1.16.0 @shadcn/lint@^0.2.1
```

Keep app-specific paths and exceptions in native JSON fields:

```json
{
  "extends": [
    "./node_modules/@aranlucas/oxforge/configs/recommended.json",
    "./node_modules/@aranlucas/oxforge/configs/nextjs.json",
    "./node_modules/@aranlucas/oxforge/configs/tailwind.json",
    "./node_modules/@aranlucas/oxforge/configs/shadcn.json"
  ],
  "options": { "typeAware": true },
  "settings": {
    "next": { "rootDir": "." },
    "tailwindcss": { "entryPoint": "src/app/globals.css" },
    "shadcn": { "ui": "@/components/ui" }
  },
  "ignorePatterns": ["src/generated/**"],
  "rules": { "eslint/no-console": "off" },
  "overrides": [
    {
      "files": ["tests/strict-fake.ts"],
      "rules": {
        "anti-slop/no-runtime-typeof": ["error", { "allowInTypeGuards": true }]
      }
    }
  ]
}
```

Local rules take precedence over inherited settings. To turn off named types, set `oxforge/no-inline-types: "off"`. For a Worker or Node project, set `env.worker` or `env.node`. React Native can use `react.json` with its existing `__DEV__` global, import allowlist, and platform-specific accessibility overrides.

The shadcn preset preserves the shared Card spacing, Carousel gutter, and Skeleton rounding contracts from the shopping project. Custom class allowlists, UI implementation exceptions, SVG exceptions, and SDK-specific import restrictions stay local.

## Stricter shared defaults and adoption

The shared defaults include strict equality at null boundaries, CSS-only side-effect imports,
and component-only exports in React modules. Next.js retains its existing metadata and
route-configuration export names; those names are not allowed by the generic React preset.
`typescript/prefer-readonly-parameter-types` remains disabled in every preset.

The Vitest preset requires unit tests in `test/` folders with a `.test` suffix. End-to-end tests
may use an `e2e/` folder or an `.e2e` suffix. Test paths cannot contain a `src/` segment relative
to the consumer project. Filename checks do not identify arbitrary test code in helper files.

`no-unused-vars: "error"` uses Oxlint's native defaults. Named underscore-prefixed variables and
parameters remain allowed; a bare `_` parameter is checked. Removing explicit ignore patterns
does not mean all underscore-prefixed names now fail. See the [rule documentation](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-unused-vars).

These changes can reveal existing source violations. Do not remove stricter project protection
until a released shared version containing the same effective behavior is actually installed and
validated with that project's normal checks. In particular, Raleigh's narrower Next.js export
allowlist remains a stricter local policy. This source change does not release a package or update
consumer lockfiles. Keep package-age and security policies in place during adoption. See the
[consumer evidence and migration guidance](docs/strict-policy-adoption.md).

## Formatting

Defaults: 100 columns, semicolons, double quotes, two spaces, trailing commas, LF endings, sorted package manifests, and preserved prose wrapping. Import sorting is opt-in.

Override the static config with ordinary object spread:

```ts
import config from "@aranlucas/oxforge/format-config";

const projectConfig = {
  ...config,
  printWidth: 80,
  sortTailwindcss: {
    stylesheet: "app/globals.css",
    functions: ["cn", "clsx", "cva", "twMerge", "twJoin"],
  },
  ignorePatterns: [...(config.ignorePatterns ?? []), "src/generated/**"],
};

export default projectConfig;
```

Oxfmt does not offer JSON preset inheritance, so its shared config uses a static module export. No function call is needed. See [Oxfmt's configuration documentation](https://oxc.rs/docs/guide/usage/formatter/config).

Vienna can keep `printWidth: 120`, `semi: false`, and `singleQuote: true`. The system-design projects can keep `quoteProps: "preserve"`; projects relying on manifest order can keep `sortPackageJson: false`. Documentation can keep `semi: false` and `trailingComma: "es5"`.

## Policy and audit

- Strict correctness, suspicious-code, performance, and pedantic categories. Warnings fail the run; unused disable comments are errors.
- No `any`, non-null assertions, chained assertions, vague `unknown` APIs, reflection escape hatches, module mocking, or unsafe dictionary types. Assertions need safety comments.
- Named module-level object and tuple types. `oxforge/no-inline-types` covers signatures, casts, generics, and local declarations.
- Kebab-case filenames, strict equality with `== null` allowed, control-flow braces, precise imports, handled promises, immutable array operations, and readable spacing.
- The initializer writes project-local ignores for build output, dependencies, coverage, and agent directories. App-specific generated files stay in app configs.

The audit covers 75 local project directories, including 63 owned Git repositories, 59 Oxlint configs, 35 Oxfmt configs, and 257 distinct explicit Oxlint rules. [Inventory](docs/inventory.md), [policy decisions and coverage](docs/policy.md), and [the raw snapshot](docs/projects.json) record the source settings and conflicts. Legacy ESLint rules with no native Oxlint equivalent are documented there.

## Migrate an existing project

1. Install Oxforge and the required tools with pnpm. Add optional plugins for the presets you select.
2. Add the desired presets to the existing `.oxlintrc.json` through `extends`.
3. Remove repeated rules supplied by those presets. Keep differing rules, `settings`, `env`, `globals`, generated-file ignores, and file-specific overrides. Additional local plugins still use `jsPlugins`.
4. Replace `.oxfmtrc.json` with `oxfmt.config.ts` importing the static formatter config and retaining relevant exceptions.
5. Run `pnpm lint` and `pnpm format:check`. Oxforge strengthens several existing policies; review diagnostics before applying fixes.

Keep only one lint and one format config per directory. Nested Oxlint configs must explicitly extend the parent; parent configs are not merged automatically. Passing `--config` disables nested lint config lookup. Root-only `options.typeAware` and `options.typeCheck` belong in the root config, not a shared preset or a nested config. See [nested config behavior](https://oxc.rs/docs/guide/usage/linter/nested-config).

```json
{
  "extends": ["../../.oxlintrc.json"],
  "env": { "node": true }
}
```

Existing projects have not been modified by this extraction. Their exceptions are recorded in the inventory for migration.

## Optional programmatic API

The original typed factories remain available for projects that prefer composing options in code:

```ts
import { oxforge } from "@aranlucas/oxforge";

export default oxforge({ nextjs: true, vitest: true });
```

`oxforge()` accepts native config fields plus `react`, `nextjs`, `reactPerf`, `vitest`, `typeAware` (default true), `namedTypes` (default true), `allowTypeGuards`, `pedantic`, `sizeLimits`, `tailwind: { stylesheet, settings? }`, and `shadcn: { ui?, componentImports? }`. Project values win; plugin and ignore arrays are additive. `format()` from `@aranlucas/oxforge/format` accepts Oxfmt options. Static JSON presets are generated from the same rule definitions as this API.

## Develop and publish

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:package
pnpm pack
```

Releases are published automatically from `main` by semantic-release. See [docs/releasing.md](docs/releasing.md).

The build emits the typed plugin and generates deterministic JSON presets. `pnpm check` checks the public API, lints the package using its JSON preset, verifies formatting, and runs real CLI tests through Vitest. `pnpm test:watch` reruns tests during development. `pnpm test:package` installs a tarball in a separate pnpm consumer and verifies preset inheritance, custom plugin resolution, typed diagnostics, shared ignores, static formatting, and initializer behavior.

Publishing runs both checks first. Version 0.1.1 enables pedantic checks by default, uses the standard filename-case rule options, and adds Unicorn checks for error messages, specific disable comments, `Object.fromEntries`, `String.raw`, and immutable array reversal. CI validates Node 22 and 24 on Linux and macOS. Regenerate the inventory with `pnpm audit:projects /path/to/Projects`; this does not automatically change the curated rules.

MIT licensed. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
