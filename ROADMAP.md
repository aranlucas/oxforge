# Oxforge feature roadmap

Updated 2026-10-26. Proposed developer-facing releases; the current planning pass
does not publish packages or update consumers. Digits/MCP feature delivery has
portfolio priority.

## Starting point

Baseline `aea798908d97c70590ebb646917842b745c92662`: the [package](README.md)
already supplies native lint/format presets, framework profiles, initialization,
an opt-in maintainability gate and installed-tarball consumer tests. The next
value to test is easier policy adoption without losing project-specific safety.

## Ordered releases

1. **Adopt a focused reliability profile.** Offer a clearly scoped opt-in
   configuration for service/MCP maintainers starting with correctness and
   asynchronous failure handling, before broader style policy. Acceptance:
   every selected rule names its native or custom owner, type-aware/runtime
   requirements are explicit, and valid provider cleanup and lifecycle code
   have representative fixtures. Static lint cannot prove authorization,
   remote completion or absence of races.
2. **Preview an upgrade's effective policy changes.** Give a maintainer a
   reviewable account of newly enabled rules, strengthened options and retained
   local exceptions. Acceptance: nested configs, generated exclusions and
   framework-specific exports are included; no config is overwritten. Build
   on native configuration output, ordinary diffs and existing project data;
   introduce no second linter or custom validation runner.
3. **Provide tested adoption paths for the owned stacks.** Maintain small,
   realistic Node service, Worker/MCP and React/Next consumer examples using
   public package exports. Acceptance: their documented commands work from
   the installed package and a frozen dependency set, with meaningful passing
   and failing cases in the existing package-test project. Extend the shipped
   tarball tests rather than adding another smoke-test framework.
4. **Make stricter releases easy to assess and undo.** Pair a policy release
   with a concise migration guide and representative consumer results.
   Acceptance: distinguish merged source, published version and consumer
   adoption; preserve stricter local protections until equivalence is verified;
   pinning the previous version remains an explicit recovery option.

## First slice and evaluation

Pilot the reliability profile in two owned services. Classify each diagnostic
as a real defect, useful review obligation or false positive; measure adoption
time, manual exceptions and recurring defects prevented. More diagnostics and a
lower complexity number alone are not success. Stop widening defaults when
noise exceeds the value of the findings.

Use the [maintainability workflow](docs/maintainability.md) and native Oxlint
reports for comparable baselines. Generic custom detection belongs in the
anti-slop package only when native rules cannot express the demonstrated case;
Oxforge owns selection and composition, consumers own local policy.
