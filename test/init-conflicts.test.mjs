import assert from "node:assert/strict";
import { lstat, mkdtemp, readlink, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { packageCommand } from "./helpers/package-command.mjs";

const binary = fileURLToPath(new URL("../bin/oxforge.js", import.meta.url));
const configNames = [
  ".oxlintrc.json",
  ".oxlintrc.jsonc",
  "oxlint.config.ts",
  "oxlint.config.mts",
  ".oxfmtrc.json",
  ".oxfmtrc.jsonc",
  "oxfmt.config.ts",
  "oxfmt.config.mts",
];

test.each(configNames)("initializer protects dangling %s before writing configs", async (name) => {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-init-conflict-"));
  try {
    await symlink("missing-shared-config", path.join(directory, name));
    const result = await packageCommand(process.execPath, [binary, "init"], {
      cwd: directory,
      deadline: performance.now() + 30_000,
      expectedStatus: 1,
    });
    assert.ok(result.stderr.includes(`Existing config: ${name}.`), result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(await readlink(path.join(directory, name)), "missing-shared-config");
    for (const other of configNames.filter((candidate) => candidate !== name)) {
      await assert.rejects(lstat(path.join(directory, other)), { code: "ENOENT" });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
