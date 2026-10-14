# Adopt shared Tailwind formatting

The shared helper and attribute lists originate in
[Set & Signal #71](https://github.com/aranlucas/set-and-signal/pull/71), merged on October 14, 2026.
Its `web/oxfmt.config.ts` still carries those lists locally because its released Oxforge dependency
does not yet contain this API. The Oxforge 0.2.0 candidate is unreleased; this change does not
publish it or update a consumer to an unavailable version.

## Set & Signal after publication

1. Wait for the release containing `format-tailwind` and preserve the repository's normal
   release-age and security checks. Do not add an exception or point a dependency at an
   unpublished version.
2. Upgrade `@aranlucas/oxforge` with the repository's declared package manager and regenerate
   the lockfile. Since 0.2.0 also contains stricter lint defaults, complete its
   [upgrade checklist](../CHANGELOG.md#consumer-upgrade-checklist).
3. In `web/oxfmt.config.ts`, use the dedicated Tailwind default import:

   ```ts
   import base from "@aranlucas/oxforge/format-tailwind";
   ```

4. Replace only the `sortTailwindcss` object with:

   ```ts
   sortTailwindcss: {
     ...base.sortTailwindcss,
     stylesheet: "src/app/index.css",
   },
   ```

5. Leave the complete existing `ignorePatterns` array intact, including catalog, generated,
   locale, agent, and lint-tool exclusions. Keep the stylesheet path relative to the web config.
6. Compare the effective configs and formatted output before/after, using the app's real
   stylesheet, custom theme, helper calls, and custom attributes. Run formatting, lint, types,
   tests, and production build. Do not remove stronger unrelated local policies.

`pnpm test:package` checks an isolated installed tarball using all public formatter entrypoints.
Its nested consumer stylesheet includes a custom theme color, and Oxfmt runs from the parent
directory. The original explicit lists, shared static export, `format()` helper, and dedicated Tailwind default must produce
identical output. Every helper and attribute is exercised, unrelated names remain untouched,
ignored files stay unchanged, repeated formatting is stable, and `true` / `false` are tested. A direct default re-export also proves sorting is enabled without a local toggle.

## Verified app baseline

On October 14, 2026, the shared static config and dedicated Tailwind default were also compared locally with Set & Signal's
merged commit `5a800f729270e00612ad932c88684ffdb7b3aded`. Effective formatter configs were equal.
Oxfmt 0.73.0 formatted 231 matched source files using the real `src/app/index.css` and its
imports; all 244 source-file hashes were identical between the explicit and shared configs.
This is formatting-equivalence evidence, not a consumer dependency upgrade or a new app
lint/type/test/build validation.
