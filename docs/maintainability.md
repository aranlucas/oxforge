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

Save this as `complexity-audit.json` to measure every function, including functions
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

Guard clauses can reduce nesting without reducing branches. Measure every extracted helper as well as its caller; moving branches between functions is not evidence of simpler behavior. Preserve failure propagation, cleanup, validation, and public behavior with the existing tests.

Rule reference: [Oxlint complexity](https://oxc.rs/docs/guide/usage/linter/rules/eslint/complexity).
