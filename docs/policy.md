# Policy rationale and migration provenance

Current rule settings live in [rules/](../rules); distributable presets live in [configs/](../configs). These decisions explain deliberate tradeoffs when composing or adopting them:

- `no-unsafe-type-assertion` stays off because it rejects documented boundary assertions and most source projects disabled it. Anti-slop still requires safety comments for assertions.
- Size and branching limits remain opt-in: source projects disagree on size limits, and existing code needs a measured complexity migration. See the [maintainability workflow](maintainability.md).
- Native `oxc/no-map-spread` stays off in favor of the anti-slop array rules, avoiding overlapping enforcement.
- App-specific class allowlists, UI implementation imports, generated paths, SVG exceptions, and SDK constraints stay with consumers. Shared shadcn rules preserve the original Card spacing, Carousel gutter, and Skeleton rounding contracts.
- Import sorting is opt-in because only one source project used it. Preserve local formatter choices such as manifest order, quote properties, and line width during migration.

## Historical migration inputs

[projects.json](projects.json) preserves the 2026-10-13 extraction inputs: original configuration options, ignores, overrides, and project paths. It is historical migration data, not a report of current consumer adoption or current preset behavior. Paths refer to the projects as captured, not files in this repository. The retired cross-project audit utility is not part of the build or published package.

Legacy ESLint migration constraints from that review:

- Imported third-party presets were not expanded into individually audited rules. Raycast consumers should retain their framework checks until equivalence is verified.
- The legacy `jsx-a11y/no-onchange` rule had no native equivalent in the audited Oxlint 1.88.0; retain a sidecar if that contract is still required. Disabled obsolete `interface-name-prefix` and TypeScript-irrelevant `react/prop-types` rules were omitted from Oxforge.
- The documentation app's floating-promise, unescaped-entity, and Next image exclusions differ from the stronger shared policy. Its formatter exceptions were `semi: false` and `trailingComma: "es5"`. Mobile UI-specific `immutability`/`refs` and import-resolution exceptions also remain consumer decisions.
