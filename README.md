# Oxforge

**Strict types. Readable code. No slop.**

Lucas's opinionated [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) policy, forged from the configs across his projects. One package replaces the repeated rule lists; small local configs keep the exceptions that actually belong to an app.

Built on [@aranlucas/oxlint-plugin-anti-slop](https://github.com/aranlucas/oxlint-plugin-anti-slop), the published packaging fork of [Dillon Mulroy's anti-slop](https://github.com/dmmulroy/anti-slop). Oxforge enables all 18 generic anti-slop rules and adds a named-types plugin, strict native rules, framework presets, and a shared formatter. See [provenance](NOTICE.md).

## Install

Requires Node **22.18+** or **24+**, Oxlint **1.88+ within v1**, and Oxfmt **0.73 within v0.73**. The type-aware checker is enabled by default.

```sh
pnpm add -D @aranlucas/oxforge oxlint@^1.88.0 oxfmt@^0.73.0 oxlint-tsgolint@^7.0.2004
pnpm exec oxforge init
```

For React, use `pnpm exec oxforge init --react`; for Next.js, use `--next`. Add `--vitest` to enable test rules, or `--no-type-aware` for a JavaScript-only project without the checker. The initializer refuses to overwrite existing configs.

`oxlint.config.ts`:

```ts
import { oxforge } from "@aranlucas/oxforge";

export default oxforge();
```

`oxfmt.config.ts`:

```ts
import { format } from "@aranlucas/oxforge/format";

export default format();
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

Oxlint and Oxfmt discover these config files directly, so editors, CI, and their normal CLIs all use the same policy. [Oxlint's shared-config documentation](https://oxc.rs/docs/guide/usage/linter/config#extend-shared-configs) and [Oxfmt's configuration documentation](https://oxc.rs/docs/guide/usage/formatter/config) explain their native config loading.

## The opinions

- Strict correctness, suspicious-code, and performance categories. Errors fail the run; unused disable comments are errors.
- No `any`, non-null assertions, chained assertions, vague `unknown` APIs, reflection escape hatches, module mocking, or unsafe dictionary types. Assertions need safety comments.
- Object and tuple types have names at module level. `oxforge/no-inline-types` covers signatures, casts, generics, and local declarations.
- Kebab-case filenames, strict equality with `== null` allowed, braces around control flow, precise imports, handled promises, and immutable array operations.
- All [18 anti-slop rules](rules/anti-slop.json), including readable spacing and avoiding filter/map chains and copying reduce accumulators.
- Semicolons, double quotes, two spaces, trailing commas, LF endings, and a 100-column line width. Package manifests are sorted; prose wrapping is preserved. Import sorting is opt-in.
- Build output, dependencies, coverage, and agent directories are ignored. App-specific generated files stay in app configs.

The audit covers **75 local project directories**, including **63 owned Git repositories**, **59 Oxlint configs**, **35 Oxfmt configs**, and **257 distinct explicit Oxlint rules**. [Inventory and observed variants](docs/inventory.md), [policy decisions and rule coverage](docs/policy.md), and [the raw config snapshot](docs/projects.json) explain where each opinion came from.

## Framework options

```ts
import { oxforge } from "@aranlucas/oxforge";

export default oxforge({
  nextjs: true,
  vitest: true,
  tailwind: { stylesheet: "src/app/globals.css" },
  shadcn: { ui: "@/components/ui" },
  settings: { next: { rootDir: "." } },
});
```

Install the optional plugins when using their options:

```sh
pnpm add -D oxlint-tailwindcss@^1.16.0 @shadcn/lint@^0.2.1
```

| Option            | Default | Policy                                                                                                          |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `typeAware`       | `true`  | Strict promise handling and type-aware safety rules; requires `oxlint-tsgolint`.                                |
| `namedTypes`      | `true`  | Named module-level object and tuple types.                                                                      |
| `allowTypeGuards` | `false` | Allow the existing anti-slop `typeof` exception inside type guards.                                             |
| `react`           | `false` | React, hooks, compiler rules, automatic JSX runtime, and accessibility.                                         |
| `nextjs`          | `false` | Next.js plus React and accessibility.                                                                           |
| `reactPerf`       | `false` | React plus rules against fresh JSX prop objects and functions; opt in when appropriate for your compiler setup. |
| `vitest`          | `false` | Valid assertions; no focused or disabled tests.                                                                 |
| `pedantic`        | `false` | Enable the entire native pedantic category.                                                                     |
| `sizeLimits`      | `false` | 300-line files, 120-line functions, 16 imports; comments and blank lines excluded.                              |
| `tailwind`        | `false` | Supply `{ stylesheet }`. Strict token and utility rules; use gap instead of `space-x/y`.                        |
| `shadcn`          | `false` | Supply plugin settings such as `{ ui: "@/components/ui" }`. Variants own appearance; callers own layout.        |

Tailwind and shadcn preserve the shared Card spacing, Carousel gutter, and Skeleton rounding contracts from the shopping project. CSS entry points, custom class allowlists, component import paths, and shared UI implementation exceptions stay explicit in the consuming project.

All remaining options are native Oxlint config fields. Rule values and other project values win over the preset. Plugin and ignore arrays are additive. Settings merge at the plugin namespace level.

```ts
import { oxforge } from "@aranlucas/oxforge";

export default oxforge({
  react: true,
  env: { node: true },
  ignorePatterns: ["src/generated/**"],
  rules: {
    "eslint/no-console": "off",
  },
  overrides: [
    {
      files: ["tests/strict-fake.ts"],
      rules: {
        "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
      },
    },
  ],
});
```

For a Worker or Node project, set `env: { worker: true }` or `env: { node: true }`. React Native can use `react: true` with its existing `__DEV__` global, import allowlist, and platform-specific accessibility overrides.

## Formatting options

```ts
import { format } from "@aranlucas/oxforge/format";

export default format({
  printWidth: 80,
  sortTailwindcss: {
    stylesheet: "app/globals.css",
    functions: ["cn", "clsx", "cva", "twMerge", "twJoin"],
  },
  ignorePatterns: ["src/generated/**"],
});
```

Every native Oxfmt option is accepted. To preserve Vienna's style, use `format({ printWidth: 120, semi: false, singleQuote: true })`. The system-design projects can keep `quoteProps: "preserve"`; projects relying on manifest order can keep `sortPackageJson: false`. The documentation project can keep `semi: false` and `trailingComma: "es5"`.

## Migrate an existing project

1. Install Oxforge and its required tools with pnpm. Add optional plugins for the framework options you select.
2. Replace the directory's `.oxlintrc.json` with `oxlint.config.ts` importing `oxforge`. Pick the framework options matching the current config.
3. Remove rule entries already supplied by the preset. Keep differing rules, `settings`, `env`, `globals`, `ignorePatterns`, and file-specific `overrides` in the factory call. Keep extra local plugins through `jsPlugins`. The inventory records these values for every audited project.
4. Replace `.oxfmtrc.json` with `oxfmt.config.ts` importing `format`, retaining formatting exceptions and stylesheet paths.
5. Run `pnpm lint` and `pnpm format:check`. Oxforge deliberately strengthens several existing policies; review the resulting diagnostics before applying fixes.

Keep only one Oxlint and one Oxfmt config per directory. Nested Oxlint configs must explicitly import their parent config through `extends`; Oxlint does not merge parent configs automatically. Passing `--config` disables nested lint config lookup. Root-only options such as `typeAware` must be left out of nested configs. [Oxlint nested config behavior](https://oxc.rs/docs/guide/usage/linter/nested-config) documents these constraints.

For example, a nested package can inherit a root config and only adjust its environment:

```ts
import { defineConfig } from "oxlint";
import rootConfig from "../../oxlint.config.ts";

const { options: _options, ...inherited } = rootConfig;

export default defineConfig({
  extends: [inherited],
  env: { node: true },
});
```

Generated code, browser-test loop exceptions, SVG `shapeRendering`, SDK-specific import bans, named shadcn classes, and app-specific element/component contracts are intentionally retained as project overrides. Oxforge centralizes the shared policy without pretending those contexts are interchangeable. Existing repositories have not been modified by this package extraction.

## Develop and publish

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:package
pnpm pack
pnpm publish --access public
```

`pnpm check` builds the plugin, checks the public TypeScript API, lints the package with Oxforge, verifies formatting, and runs real CLI integration tests. `pnpm test:package` installs the packed tarball in a separate consumer and verifies config discovery, type-aware linting, plugin resolution, initializer behavior, and formatting.

Publishing runs both checks first. Version `0.1.0` is ready for the first npm release; subsequent releases should document rule changes because they may introduce new diagnostics. CI validates Node 22 and 24 on Linux and macOS.

Regenerate the inventory with `pnpm audit:projects /path/to/Projects`. This inventories JSONC files and executable config filenames without executing other projects' configuration code. The policy presets are curated and do not change automatically when the audit is rerun.

MIT licensed. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
