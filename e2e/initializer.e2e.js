import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "e2e";
import { packageCommand } from "../test/helpers/package-command.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("initialize, lint, fix formatting, and preserve existing consumer configuration", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-e2e-"));
  const deadline = performance.now() + 55_000;
  const run = (binary, args, expectedStatus = 0) =>
    packageCommand(process.execPath, [path.join(root, binary), ...args], {
      cwd: directory,
      deadline,
      expectedStatus,
    });
  try {
    await mkdir(path.join(directory, "node_modules/@aranlucas"), { recursive: true });
    await symlink(root, path.join(directory, "node_modules/@aranlucas/oxforge"), "dir");
    await writeFile(path.join(directory, "package.json"), '{"type":"module"}\n');
    await run("bin/oxforge.js", ["init", "--next", "--vitest", "--no-type-aware"]);
    const lintPath = path.join(directory, ".oxlintrc.json");
    const formatPath = path.join(directory, "oxfmt.config.ts");
    const lintBefore = await readFile(lintPath, "utf8");
    const formatBefore = await readFile(formatPath, "utf8");
    const config = JSON.parse(lintBefore);
    expect(config.options.typeAware).toBe(false);
    expect(config.extends.map((entry) => path.basename(entry))).toEqual([
      "base.json",
      "nextjs.json",
      "vitest.json",
    ]);
    const sample = path.join(directory, "sample.ts");
    await writeFile(sample, "export const answer = 42;\n");
    const clean = await run("node_modules/oxlint/bin/oxlint", ["sample.ts", "--format", "json"]);
    expect(JSON.parse(clean.stdout).diagnostics).toEqual([]);
    await writeFile(
      sample,
      "export function read(value: { readonly id: string }) { return value.id; }\n",
    );
    const invalid = await run(
      "node_modules/oxlint/bin/oxlint",
      ["sample.ts", "--format", "json"],
      1,
    );
    expect(
      JSON.parse(invalid.stdout).diagnostics.some((entry) =>
        entry.code?.includes("no-inline-types"),
      ),
    ).toBe(true);
    await writeFile(sample, "export const answer=42\n");
    await run("node_modules/oxfmt/bin/oxfmt", ["--write", "sample.ts"]);
    expect(await readFile(sample, "utf8")).toBe("export const answer = 42;\n");
    const repeated = await run("bin/oxforge.js", ["init"], 1);
    expect(repeated.stderr).toContain("Existing config:");
    expect(repeated.stdout).toBe("");
    expect(await readFile(lintPath, "utf8")).toBe(lintBefore);
    expect(await readFile(formatPath, "utf8")).toBe(formatBefore);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
