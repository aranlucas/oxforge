# Adopting the stricter shared defaults

This is a source-level preset change, not a package release or a fleet migration. Keep local
protection until a released version is installed under the consuming project's existing
package-age/security policies and its normal checks pass.

## Placement and behavior

- **Base:** strict equality includes null boundaries; side-effect imports allow CSS only.
  `no-unused-vars: "error"` uses Oxlint's native defaults. Named underscore-prefixed variables
  and parameters stay allowed; a bare `_` parameter is now checked.
- **Type-aware:** explicit mutable parameter types are rejected, while inferred callback
  parameters are ignored. This rule stays off in the untyped base. Exceptions are limited to
  built-in `Promise` and actual `ReactNode`/`KeyboardEvent` declarations from the React package.
  Identically named application types are not exempt. Consumers do not need to install React.
- **React:** unrelated constant exports beside components are rejected.
- **Next.js:** the same constant-export check applies, with the existing framework export names
  `metadata`, `viewport`, `generateMetadata`, `generateStaticParams`, `dynamic`, and `revalidate`
  preserved. These names are not allowed by the generic React preset. See the
  [Next.js route configuration reference](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config).

## Evidence and limits

The factory and generated JSON presets have paired behavioral fixtures covering all five
policies, readonly positive/negative cases, scoped exception matching, disabled type-aware
mode, and React versus Next.js exports. The historical packed-package consumer checked a
mutable parameter failure and a readonly success before its removal in `6a4bd38`. Those
policy matrices now run in the checkout Vitest suite (`pnpm test`). The bounded replacement
(`pnpm test:package`, or `pnpm exec vitest run --project package`) uses Vitest fixture
hooks and cases to check installed exports/declarations, CLI/preset/plugin resolution,
a floating-promise diagnostic, and basic formatting; it does not repeat the readonly matrix.

An isolated snapshot of [Raleigh #15](https://github.com/aranlucas/raleigh-travel/pull/15) at
`43e58406f88ffd5a544616da3554e084a6014e8a` reports zero diagnostics before and after substituting
these shared presets for its five local entries. This is a lint compatibility probe; it does
not update that project's dependencies or repeat its full build/test suite. Its narrower
Next.js export allowlist remains a deliberate stronger local policy until separately reviewed.

A second application sample goes from zero to 57 readonly diagnostics. Type-only changes to
owned input records and arrays remove 12 of those diagnostics with TypeScript still passing.
The remaining 45 involve library/UI types or recursive framework/SDK contracts and need
case-by-case review. Representative shallow `Readonly<T>` wrappers do not make those deep
contracts readonly. These diagnostics are not evidence of 57 mutation bugs, nor were analyzer
false positives established by this probe.

Prefer readonly owned records/arrays where functions only read them. For intentional mutable
SDK/framework boundaries, preserve the actual API contract and justify a narrow type-specific
or project exception when needed. Do not hide warnings with casts, change I/O ordering, or add
many inline suppressions just to report zero overrides. No broad new SDK exemption is added
by this change; adoption is intentionally explicit and may require source work.
