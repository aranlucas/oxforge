# Changelog

## 0.2.0 (unreleased)

This is a release candidate, not a statement that the package has been published. The new minor
version provides an explicit upgrade boundary for stricter lint defaults: `^0.1.3` remains on
0.1.x. Existing runtime exports remain compatible. Node engine requirements and runtime dependencies are unchanged.

### Compatibility-affecting defaults

These policies apply through both the factory API and generated JSON presets:

- **Base:** `eqeqeq` checks null comparisons too. Preserve intentional null-or-undefined handling
  with explicit strict checks rather than mechanically replacing a nullish comparison.
- **Base:** side-effect imports allow CSS only; the former `**/env` exemption is removed. Review
  intentional initialization imports and keep a narrow documented consumer exception when needed.
- **Base:** `no-unused-vars` now uses Oxlint's native defaults. Named underscore-prefixed bindings
  remain allowed; a bare `_` parameter is checked.
- **Type-aware:** `prefer-readonly-parameter-types` checks explicitly annotated parameter types.
  Inferred callback parameters are ignored. Exemptions are limited to built-in `Promise` and
  actual `ReactNode`/`KeyboardEvent` declarations from the React package, not same-named local
  types. Untyped base consumers do not get this check, and installing React is not required.
- **React and Next.js:** arbitrary constant exports beside components are rejected. Next.js keeps
  its existing `metadata`, `viewport`, `generateMetadata`, `generateStaticParams`, `dynamic`, and
  `revalidate` exceptions; the generic React preset does not allow these framework exports.

Readonly diagnostics can require real source changes. Prefer readonly owned records and arrays
when the function only reads them. Preserve intentionally mutable framework/SDK contracts and
review narrow boundary-specific exceptions; do not hide diagnostics with casts or blanket rule
disables. A shallow `Readonly<T>` does not make every nested contract readonly. See the
[strict-policy adoption guide](docs/strict-policy-adoption.md) for tested cases and known limits.

### Vitest API compatibility

The shared Vitest preset accepts the documented second message argument in `expect(actual,
message)`. The `valid-expect` rule stays enabled at error severity and still rejects zero/three
arguments, missing matchers, and unawaited async expectations. Paired factory/generated-preset
fixtures cover both accepted and rejected forms.

### Shared Tailwind formatting

`tailwindSortConfig` is exported by both `@aranlucas/oxforge/format` and
`@aranlucas/oxforge/format-config`. It centralizes the helper/attribute names from Set & Signal.
`format({ sortTailwindcss: true })` or an object opts into those defaults; explicit local fields
replace them. Paths remain consumer-specific. Sorting stays disabled when omitted or false,
and non-Tailwind consumers gain no Tailwind requirement. Keep local sorting lists until this
candidate is actually published and adopted. See the [migration guide](docs/tailwind-formatting-adoption.md).

### Test layout and strict Vitest policy

The Vitest preset requires conventional `.test.*` / `.spec.*` files to live under a `test/`
path segment and use `.test.*` names. Keep the folder beside the package's production source
and mirror its relative paths. JavaScript and module-specific extensions remain supported;
setup, helper, fixture, and snapshot files do not need test suffixes. The filename rule cannot
identify arbitrary unconventionally named suites or validate source-path mirroring.

The preset now rejects `node:test` imports, conditional/standalone expectations, duplicate or
invalid titles, invalid suite callbacks, interpolated snapshots, and unspecified expected errors,
in addition to focused/disabled tests and malformed/unawaited expectations. The second assertion
message, Node assertions, async Vitest suites, parameterized cases, and negated `not.toThrow()`
remain supported. See the [policy and migration guide](docs/test-policy.md).

### Maintainer tests

The policy/CLI suites, assertion-API regressions, and formatter-default tests run with
Vitest 5.0.3, retaining strict Node
assertions and per-test cleanup. `pnpm test:watch` provides watch mode. Test files use the
package's own existing Vitest lint preset. Vitest is a development dependency; consumers do not
need to add it to use Oxforge.

The compile-time API test is `test/api.test.ts`; package installation and formatting checks
are kept in `test/package.test.mjs` with helpers below `test/helpers/`. The package check runs
separately via `pnpm test:package`, as before, and is excluded from the ordinary Vitest run.

### Consumer upgrade checklist

1. Wait for an explicitly published 0.2.0 and the consuming project's existing release-age and
   security policies. Do not add an age exclusion to make the upgrade available early.
2. Update the intended package/workspace dependency explicitly with its declared package manager
   and regenerate the lockfile. Existing `^0.1.3` declarations intentionally do not opt in.
3. Run lint, typecheck, tests, and build. Review readonly and framework boundaries individually.
4. Compare effective presets before removing duplicate local rules. Keep stronger local policies,
   including narrower Next.js export allowlists, until separately reviewed.

### Release preparation

CI and the normal package checks must pass before publication. `prepack` builds the generated
presets/plugin; `prepublishOnly` runs `pnpm check` and `pnpm test:package`, including a separate
packed-package consumer. This candidate does not add a release workflow or publish credentials.
Publishing to npm remains a separate, explicitly authorized step after the candidate is merged
and verified. Merging the candidate alone does not update any consuming repository.
