# Correctness and reliability audit — 2026-11-06

## Scope and inventory (recorded before implementation)

Baseline: remote default `origin/main`, `40d3e1f97297071a1a7de4b090370b193583d325`, after #33. Clean bound worktree; no structural cleanup or dependency upgrades planned. Tests and builds run in CI only.

- `src/index.js`, declarations, `rules/`, `configs/`, `src/presets.js`: public factory composes feature switches, plugin resolution, project overrides and native settings. Checked default/undefined switches, React prerequisites, optional peer failures, override ordering, clone isolation and generated-preset parity against existing config, policy and API tests.
- `src/format*.js` and declarations: static presets and formatter factory; checked opt-in sorting, additive ignores, local precedence and returned nested-array isolation against existing tests. Exported static configs are intentionally mutable configuration objects, not immutable factories.
- `src/plugin.ts`: named object/tuple types and module-level declarations; checked exported/module namespace containers, enclosing declarations and local declarations against rule tests. Uses official `@oxlint/plugins` AST/rule compatibility APIs.
- `bin/oxforge.js`: command/flag validation, existing config discovery, exclusive creation and truthful exit status. Filesystem entries in the caller's working directory are the persistence/trust boundary. This is the only product path writing user data.
- `scripts/generate-configs.mjs`, package exports/files, Vite pack and release configuration: generated presets, distributed declarations/plugin and installed dependencies. Existing tarball tests pack/install an isolated consumer, compile public contracts, initialize configs, run lint diagnostics and format source. Build failures propagate; prepack is build-only and cannot recurse into the package test.
- `.github/`: CI checks build/types/lint/format/unit/package behavior; release verifies before publishing with install hooks disabled. Dependabot merge reads trusted metadata, checks current successful CI and atomically merges the tested head. No credentials, deployment or production data changes in this audit.
- README, policy/release docs, roadmap, historical `docs/projects.json`, ignore lists: reconciled runtime contracts with documented presets and initialization behavior. Historical consumer paths are not runtime data.

No server, authentication, tenancy, database, transaction service, network retry loop, or long-lived product resource exists here. These categories are inapplicable rather than untested claims of safety. Process timeouts/output limits/descendant cleanup belong to the existing CI package harness, which has explicit failure-path coverage.

## Confirmed finding

**F1 — dangling config symlinks evade conflict detection (medium impact, high confidence).**

Location: `bin/oxforge.js`, `exists()` and `init()` conflict scan. `access()` follows symlinks and returns ENOENT for a dangling target even though the config entry exists. A consumer with `oxfmt.config.ts` linked to a temporarily absent shared file gets a newly written `.oxlintrc.json`, followed by EEXIST creating the formatter file. A dangling `.oxfmtrc.jsonc` instead allows initialization to succeed and introduces competing formatter configs. The README promises refusal when config already exists. Expected: identify every existing config directory entry, including broken links, reject before writing either file and preserve the link. Fix: native `lstat()` for entry existence, retaining exclusive writes as the concurrent-create guard. No library needed beyond Node's filesystem API.

Regression contract: create dangling links at each of the eight recognized lint/format paths, invoke the actual CLI, require status 1 and the named conflict, preserve the exact link target, and verify no other config was created. Ordinary existing configs, unknown flags, successful initialization and installed-consumer journeys retain their current coverage. CI also runs the new test against the baseline CLI to demonstrate a pre-fix failure.

## Rejected hypotheses and limits

- Generated ignores are deliberately project-local: putting them in inherited JSON resolves relative to the installed preset, as documented. Not a missing-preset bug.
- Optional plugin resolution errors are appropriate when an uninstalled peer is explicitly enabled. No fallback should silently disable requested policy.
- Preset order and consumer overrides intentionally replace stricter defaults; changing them would alter public behavior.
- Object/tuple nodes nested in named type declarations are covered by the named declaration; banning those would invent policy.
- Exclusive writes prevent overwrite on concurrent init. Two-file creation is not a general transaction: a new conflict or I/O failure after the preflight can still leave a first file. This audit fixes the deterministic preflight defect; it does not claim atomic multi-file creation or remove files another process may own.

## Requested tester-army/e2e applicability

Inspected the real npm `e2e` **0.23.0** metadata and published tarball docs (`quickstart`, `ci`, `ci/github-actions`, `engines`, `writing-an-engine`, `reference/test`) on 2026-11-06. Repository identity is `tester-army/e2e`; runtime is Node `^22.22.3 || >=24.8.0`. Published docs are included in the package; public `.md` endpoints were unavailable to the web fetch, so the package supplied the guide.

The supported web/mobile engines drive a URL or installed app. The engine guide explicitly limits engines to user interfaces; its `test.extend` hooks add API/database fixtures to an existing UI target. Oxforge has no web/native UI target, and making a fake UI or no-op engine would not test its CLI/library contract. No honest supported target exists here, so no unrelated package, model credential, or passing placeholder was installed. Keep the meaningful native Vitest CLI/API/tarball end-to-end regression coverage in CI. References: [upstream](https://github.com/tester-army/e2e), [engine contract guide](https://e2e.com/docs/writing-an-engine), [test fixtures](https://e2e.com/docs/reference/test).

## Validation and independent review

Pending implementation, independent review and remote CI evidence. No local tests or builds run.
