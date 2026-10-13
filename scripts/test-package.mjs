import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const directory = await mkdtemp(path.join(tmpdir(), "oxforge-consumer-"));

function pnpm(args, cwd) {
  const result = spawnSync("pnpm", args, { cwd, encoding: "utf8" });

  assert.ifError(result.error);

  return result;
}

function successful(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

try {
  const archive = path.join(directory, "oxforge.tgz");

  successful(pnpm(["pack", "--out", archive], root));
  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({
      name: "oxforge-consumer-test",
      private: true,
      type: "module",
      devDependencies: {
        "@aranlucas/oxforge": `file:${archive}`,
        oxlint: "1.88.0",
        oxfmt: "0.73.0",
        "oxlint-tsgolint": "7.0.2004",
      },
    }),
  );
  successful(pnpm(["install", "--ignore-scripts"], directory));
  successful(pnpm(["exec", "oxforge", "init", "--next", "--vitest"], directory));
  await writeFile(
    path.join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "ES2024",
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
      include: ["sample.ts", "invalid.ts"],
    }),
  );
  await writeFile(path.join(directory, "sample.ts"), "export const answer=42\n");
  successful(pnpm(["exec", "oxlint", "sample.ts"], directory));

  const printed = pnpm(["exec", "oxlint", "--print-config", "sample.ts"], directory);

  successful(printed);

  const merged = JSON.parse(printed.stdout);

  for (const plugin of ["react", "nextjs", "vitest", "typescript", "import", "promise"]) {
    assert.ok(merged.plugins.includes(plugin), `Missing inherited plugin: ${plugin}`);
  }

  successful(pnpm(["exec", "oxfmt", "--write", "sample.ts"], directory));
  assert.equal(
    await readFile(path.join(directory, "sample.ts"), "utf8"),
    "export const answer = 42;\n",
  );
  await writeFile(
    path.join(directory, "invalid.ts"),
    "export const value = 1 as unknown as string;\n",
  );

  const invalid = pnpm(["exec", "oxlint", "invalid.ts"], directory);

  assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
  assert.match(invalid.stdout + invalid.stderr, /no-chained-type-assertions/);

  await writeFile(path.join(directory, "invalid.ts"), "Promise.resolve(1);\n");

  const floating = pnpm(["exec", "oxlint", "invalid.ts"], directory);

  assert.equal(floating.status, 1, floating.stdout + floating.stderr);
  assert.match(floating.stdout + floating.stderr, /no-floating-promises/);

  await writeFile(
    path.join(directory, "invalid.ts"),
    "export function read(value: { id: string }) { return value.id; }\n",
  );

  const inline = pnpm(["exec", "oxlint", "invalid.ts"], directory);

  assert.equal(inline.status, 1, inline.stdout + inline.stderr);
  assert.match(inline.stdout + inline.stderr, /no-inline-types/);

  await mkdir(path.join(directory, "dist"));
  await writeFile(
    path.join(directory, "dist/ignored.ts"),
    "export const value = 1 as unknown as string;\n",
  );
  successful(pnpm(["exec", "oxlint", "sample.ts", "dist/ignored.ts"], directory));
  process.stdout.write(
    "Packed package passes installation, initializer, typed linting, plugin loading, and formatting in a separate consumer.\n",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
