# Provenance

Oxforge depends on [@aranlucas/oxlint-plugin-anti-slop](https://github.com/aranlucas/oxlint-plugin-anti-slop), Lucas's published packaging fork of [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop). Anti-slop's generic rules are MIT licensed, copyright 2026 Dillon Mulroy. The fork documents its upstream commit and vendored ESLint Stylistic provenance in [UPSTREAM.md](https://github.com/aranlucas/oxlint-plugin-anti-slop/blob/main/UPSTREAM.md). Oxforge references the published package rather than copying those rule implementations.

`oxforge/no-inline-types` is adapted from Lucas's `lint/types-plugin.ts` in [system-design-companion](https://github.com/aranlucas/system-design-companion) and [system-design-chatgpt](https://github.com/aranlucas/system-design-chatgpt). It keeps the original behavior and adds Oxlint's typed rule API and tests.

The optional Effect rules in the original anti-slop project are not part of Lucas's published generic plugin and were not enabled in the audited project configurations.
