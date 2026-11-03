# Releasing

[The release workflow](../.github/workflows/release.yml) runs `pnpm check` and then semantic-release on pushes to `main`. [release.config.mjs](../release.config.mjs) selects the release plugins and branches; the workflow currently triggers only for `main`.

## Commit and package boundaries

Use a Conventional Commits PR title when squash merging: `fix:` selects a patch, `feat:` a minor, and `!` or a `BREAKING CHANGE:` footer a major. Documentation, tests, and chores alone do not select a release. Policy changes that tighten defaults should be `feat:` (or `feat!:` once past 1.0), so they do not reach consumers on a patch range.

Semantic-release updates `package.json` and generated `CHANGELOG.md`, publishes to npm, commits release metadata with `[skip ci]`, and creates a version tag and GitHub release. Keep `CHANGELOG.md` excluded from formatter checks so generated notes do not fail the publish-time gate.

`pnpm check` includes installed-package tests. To diagnose package-boundary failures, run `pnpm test:package`; it packs and installs a temporary consumer without publishing. Keep `prepack` build-only: package tests there would recursively pack the package. `prepublishOnly` runs the full check before manual publication as well.

## Preview and publishing setup

To preview the next version and notes without publishing (requires GitHub authentication):

```sh
GITHUB_TOKEN=$(gh auth token) pnpm semantic-release --dry-run --no-ci
```

The workflow uses npm OIDC trusted publishing with provenance. Configure the npm package's trusted publisher for GitHub user `aranlucas`, repository `oxforge`, workflow `release.yml`, and no environment. After verifying trusted publishing, set publishing access to require two-factor authentication and disallow tokens. The privileged release job installs with lifecycle scripts disabled and verifies the package before release.

Semantic-release discovers the previous release from version tags. Preserve `v0.2.2` at `6a4bd38`, the last commit before the manual 0.2.2 publication, and subsequent release tags when recovering history; losing the release baseline can produce an incorrect next version.
