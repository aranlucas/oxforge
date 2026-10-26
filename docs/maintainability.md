# Measure and reduce branching complexity

The optional `maintainability.json` preset uses native Oxlint rules: classic cyclomatic
complexity must be at most 9, and nested blocks at most 3. These limits are opt-in because
existing code needs a measured migration; they do not silently change the base preset.

## Adopt in a project

After installing a release that contains this preset, add
`./node_modules/@aranlucas/oxforge/configs/maintainability.json` to the existing native
configuration's `extends` list. The programmatic equivalent is `oxforge({ maintainability: true })`.
Local rule overrides remain authoritative.

```json
{
  "extends": [
    "./node_modules/@aranlucas/oxforge/configs/recommended.json",
    "./node_modules/@aranlucas/oxforge/configs/maintainability.json"
  ],
  "options": { "typeAware": true },
  "ignorePatterns": ["dist/**", "coverage/**", "src/generated/**"]
}
```

Keep the project's existing ignore patterns and narrower exceptions. Run the normal
`pnpm lint` command; use `pnpm exec oxlint --format json src > complexity-review.json` when
a machine-readable diagnostic report is useful. Substitute the project's source paths for
`src`. The shell exit status still reports lint failures; a written JSON file is not a pass.

## Establish a baseline

Use a separate native audit configuration to measure every function, including functions
already below the threshold:

```json
{
  "categories": {
    "correctness": "off",
    "suspicious": "off",
    "pedantic": "off",
    "perf": "off",
    "style": "off",
    "restriction": "off",
    "nursery": "off"
  },
  "rules": {
    "eslint/complexity": ["warn", { "max": 0, "variant": "classic" }]
  }
}
```

Run `pnpm exec oxlint --config complexity-audit.json --format json src > complexity-before.json`.
Repeat with the same analyzer version, file set, and exclusions after the change. Retain the
commit SHA and commands with both reports. A separately supplied config disables nested config
discovery, so its explicit source selection and exclusions must be recorded.

Classic complexity starts at one. It counts independent branches from `if`/`else if`, loops,
switch cases, ternaries, short-circuit expressions, catch clauses, optional chaining, and default
initializers. A plain `else` adds no separate decision. The modified variant counts a whole switch
once; do not change variants between measurements to make a result appear better.

Guard clauses improve nesting even when the branch count stays the same. Prefer eliminating
duplicate decisions or replacing uniform dispatch branches with a table. Extract helpers around
real responsibilities, then measure the caller and every helper. Preserve failure propagation,
cleanup, validation, and public behavior with the existing test runner.

## Example: configuration composition

The configuration builder previously combined feature defaults, prerequisite selection, native
plugins, optional plugin settings, consumer overrides, and test-path policy in one function.
With Oxlint 1.89.0, `oxforge()` measured **41**. Its refactored orchestration measures **7**;
every extracted helper is **6 or below**. Feature selection is now an ordered table, and the
React prerequisite is evaluated once for rules, plugins, and browser globals.

```js
const { features, project } = splitOptions(options);
const usesReact = [features.react, features.nextjs, features.reactPerf, features.shadcn].some(
  Boolean,
);
const presets = selectedPresets(features, usesReact);
```

This is the orchestration excerpt from `src/index.js`; the full function retains consumer
precedence and returns a fresh clone. Defaults are selected only for `undefined`, matching the
previous destructuring behavior. The refactor reduces the branches in the implementation, not
the number of supported feature combinations. A differential check compared **4,096** existing
configurations (all 2,048 feature combinations, with and without consumer overrides) and found
identical results. Permanent CLI tests check both factory and generated presets at the complexity
9/10 and nesting 3/4 boundaries, alongside existing composition and isolation tests.

The existing config generator is retained because it materializes this package's rule tables
and portable plugin paths into distributable JSON. Native Oxlint runs the resulting policy;
there is no new wrapper, setup script, bespoke test runner, or custom complexity calculator.

## Repeat across repositories

For each project, record its base, source scope, largest functions, existing checks, confirmed
findings, and validation limits. Fix one coherent behavior or module at a time. Run the project's
normal tests, types, lint, and relevant build; commit a verified chunk; fetch and rebase before
integration if the base moved. Reuse existing native rules for recurring findings before adding
a shared plugin rule. New plugin rules need invalid examples, valid counterexamples, and a real
CLI test through the published entry point.

References: [Oxlint complexity](https://oxc.rs/docs/guide/usage/linter/rules/eslint/complexity),
[configuration](https://oxc.rs/docs/guide/usage/linter/config), and
[plugin tests](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins).
