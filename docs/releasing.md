# Releasing

`.github/workflows/release.yml` publishes `@aranlucas/oxforge` to npm and creates the matching
GitHub Release. Pushing a `v*.*.*` tag triggers it.

## Cut a release

1. Bump `version` in `package.json` and move the `CHANGELOG.md` entry out of "unreleased".
2. Merge to `main`.
3. Tag the merge commit and push the tag:

   ```sh
   git tag v0.2.3
   git push origin v0.2.3
   ```

The workflow then:

- **preflight** fails if the tag is not `v` + the `package.json` version. It picks the npm dist-tag:
  `latest` for `x.y.z`, `next` for prereleases such as `x.y.z-beta.1`. It also checks whether npm
  already has this version.
- **publish** runs `pnpm check` and `pnpm pack`, then `npm publish --dry-run`. If the dry run
  passes, it publishes the tarball with `--provenance` over OIDC trusted publishing, so there is
  no npm token. It skips the publish when npm already has the version, so re-running a failed
  release is safe.
- **release** creates the GitHub Release with generated notes and attaches the tarball. A
  prerelease is marked as a prerelease and is not made "latest".

To test the pipeline without publishing, start it manually from the Actions tab with
`dry_run` checked. Everything up to the npm dry run runs, and nothing is published.

## One-time setup: npm trusted publisher

Trusted publishing replaces `NPM_TOKEN`. On npmjs.com, open the package, go to
**Settings → Trusted publishing**, and add a GitHub Actions publisher:

- Organization or user: `aranlucas`
- Repository: `oxforge`
- Workflow filename: `release.yml`
- Environment: leave empty

Once the first trusted publish works, set **Publishing access** to "Require two-factor
authentication and disallow tokens" so CI is the only way to publish.
