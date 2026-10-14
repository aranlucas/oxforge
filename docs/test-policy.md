# Test layout and strict Vitest policy

## Layout contract

Keep each package's tests in a singular `test/` directory beside its production source. Mirror
source paths so a review separates changes to implementation and tests:

- `src/lib/pricing.ts` → `test/lib/pricing.test.ts`
- `src/components/cart.tsx` → `test/components/cart.test.tsx`
- `packages/ui/src/button.tsx` → `packages/ui/test/button.test.tsx`
- `src/format.js` → `test/format.test.mjs` for an ESM JavaScript project

Use `.test.ts` or `.test.tsx` in TypeScript projects. Keep JavaScript and ESM/CommonJS extensions
where the project actually uses them: `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, and `.cts` are valid.
Do not convert a JavaScript project to TypeScript just to rename its tests.

Setup modules, reusable assertions, fixtures, and snapshots belong under `test/`, but are not
suites and should keep ordinary descriptive names, such as `test/setup.ts`,
`test/helpers/request.ts`, and `test/fixtures/order.json`.

## What the filename rule guarantees

[`vitest/consistent-test-filename`](https://oxc.rs/docs/guide/usage/linter/rules/vitest/consistent-test-filename)
checks the full path in the supported Oxlint 1.88.0 implementation. Its `allTestPattern` detects
conventional `.test.*` and `.spec.*` files; `pattern` requires a `test/` directory segment and a
`.test.*` suffix. Both separators are supported. Factory and generated-preset CLI fixtures cover
root-level files, colocated source tests, `tests/`, `__tests__/`, nested packages, and all supported
extensions. Separate regex assertions cover absolute POSIX and Windows paths; hosted CI uses
Ubuntu and macOS, so these are not a claim of a Windows-hosted run.

Rejected examples include `src/math.test.ts`, `tests/math.test.ts`,
`__tests__/math.test.ts`, and `test/math.spec.ts`. Valid examples include `test/math.test.ts`
and `packages/ui/test/math.test.ts`.

This is filename-based detection, not test discovery. `__tests__/legacy.ts`, `src/checks.ts`,
a custom `.e2e.ts` suffix, or inline source tests may escape it. Treat these as migration-audit
items; do not claim that passing lint proves every executable test has been identified.
The rule also cannot infer package roots or verify that paths mirror production source. A
`src/test/` folder technically satisfies its path pattern, but does not follow this layout contract.
Use the package-level sibling directory and review the move map.

Apply the preset to the whole package. Restricting it to `test/**` would hide the misplaced tests
it is intended to catch. Do not add `src/**` or legacy test folders to lint ignores during migration.

## Strict rules and their purpose

The preset explicitly enables the following rules at error severity, independent of consumer
category settings:

- [no-import-node-test](https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-import-node-test): prevent accidental imports from the wrong runner. This does not ban `node:assert/strict` or replace a full audit of dynamic/CommonJS loading.
- [no-focused-tests](https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-focused-tests) and [no-disabled-tests](https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-disabled-tests): prevent accidentally narrowed or skipped coverage.
- [valid-expect](https://oxc.rs/docs/guide/usage/linter/rules/vitest/valid-expect): check matcher shape and async handling. `maxArgs: 2` preserves Vitest's optional assertion message.
- [no-conditional-expect](https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-conditional-expect): reject assertions that can be bypassed by a conditional or catch-only path.
- [no-standalone-expect](https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-standalone-expect): keep expectations within tests or legitimate assertion helpers.
- [valid-describe-callback](https://oxc.rs/docs/guide/usage/linter/rules/vitest/valid-describe-callback): catch invalid suite registration. Vitest async suites and `describe.each` parameters remain supported.
- [no-identical-title](https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-identical-title) and [valid-title](https://oxc.rs/docs/guide/usage/linter/rules/vitest/valid-title): keep failure reports unambiguous and useful.
- [no-interpolation-in-snapshots](https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-interpolation-in-snapshots): keep inline snapshots updateable; use property matchers for variable values.
- [require-to-throw-message](https://oxc.rs/docs/guide/usage/linter/rules/vitest/require-to-throw-message): assert the intended error by message, regular expression, or type instead of accepting any thrown error. Negated `.not.toThrow()` remains valid.

These rules are not a proof that a test asserts the intended behavior. For example,
`no-conditional-expect` targets recognized expectations, not every custom/Node assertion helper.

We do not turn on every Vitest style rule. Assertion-count limits, mandatory `test` versus `it`,
matcher spelling preferences, and hook ordering are separate choices. `expect-expect` may be
useful after configuring each project's custom assertion helpers; enabling it blindly can flag
real tests that delegate assertions. The existing `no-conditional-in-test` exception remains:
parameterized setup and fixture construction can use control flow while expectations remain
unconditional. `require-mock-type-parameters` remains off for JavaScript consumers.

## Consumer migration checklist

1. Inventory actual runner globs, import sites, custom test suffixes, setup files, snapshots, and
   standalone script checks. Record test counts and baseline check results before moving files.
2. Map production-relative paths into each package's `test/` folder. Rename `.spec.*` to `.test.*`.
   Move helpers separately and preserve test data, snapshots, and extension/module semantics.
3. Update relative imports, aliases, fixture URLs, snapshot references, TypeScript includes,
   coverage boundaries, package scripts, and CI paths. Check build output does not start shipping
   tests after the move. Keep Playwright/browser and compile-time checks in their intended runners.
4. Update Vitest discovery to `test/**/*.test.{ts,tsx,js,jsx,mts,cts,mjs,cjs}` within each package,
   with explicit separate-runner exclusions where needed. Do not silently reduce discovery to
   the new folder before all suites have moved. Compare collected files and test counts afterward.
5. Run the project's declared package manager, frozen install, lint, types, tests, build, and any
   packed-consumer checks. Review failures and preserve meaningful expectations; do not weaken
   tests just to satisfy the policy. Recheck the exact published commit in hosted CI.
6. Adopt a released Oxforge version only through the consumer's normal package-age/security
   policies. Keep stronger local checks until effective configuration has been compared. This
   policy change does not publish a package or alter consumer dependencies by itself.

Do file moves in a dedicated reviewable change after any active source/test edits have landed,
or coordinate them with that branch's owner. Avoid mixing a fleet-wide rename with unrelated
behavior changes. Existing projects with `tests/`, `__tests__/`, `scripts/*.test.*`, or colocated
source tests need explicit migrations; changing the shared preset alone does not move files.
