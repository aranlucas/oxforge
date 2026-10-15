import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { oxforge, rules } from "@aranlucas/oxforge";

const root = fileURLToPath(new URL("..", import.meta.url));
const lintBin = path.join(root, "node_modules/oxlint/bin/oxlint");
const categories = Object.fromEntries(
  ["correctness", "suspicious", "perf", "pedantic", "style", "restriction", "nursery"].map(
    (category) => [category, "off"],
  ),
);
const validTest =
  'import { test, expect } from "vitest"; test("adds numbers", () => { expect(2 + 2).toBe(4); });';

function config(mode) {
  const factory = oxforge({ vitest: true, typeAware: false });
  return mode === "factory"
    ? { plugins: ["vitest"], categories, rules: factory.rules, overrides: factory.overrides }
    : { extends: [path.join(root, "configs/vitest.json")], categories };
}

async function lint(t, mode, files, relativeRoot = ".") {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-vitest-policy-"));
  t.onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const workingDirectory = path.join(directory, relativeRoot);
  await mkdir(workingDirectory, { recursive: true });
  // Select only the Vitest rules in the factory; generic application rules have separate tests.
  const configuration = config(mode);
  if (mode === "factory") {
    configuration.rules = Object.fromEntries(
      Object.entries(configuration.rules).filter(([name]) => name.startsWith("vitest/")),
    );
  }
  await writeFile(path.join(workingDirectory, ".oxlintrc.json"), JSON.stringify(configuration));
  await writeFile(path.join(workingDirectory, "package.json"), '{"type":"module"}');
  const targets = [];
  for (const [filename, source] of Object.entries(files)) {
    const nativeFilename = filename.replaceAll("\\", path.sep);
    const target = path.join(workingDirectory, nativeFilename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source);
    targets.push(nativeFilename);
  }
  const result = spawnSync(process.execPath, [lintBin, ...targets, "--format", "json"], {
    cwd: workingDirectory,
    encoding: "utf8",
  });
  assert.ifError(result.error);
  assert.ok(result.status === 0 || result.status === 1, result.stdout + result.stderr);
  return { ...result, diagnostics: JSON.parse(result.stdout).diagnostics };
}

const acceptedPaths = [
  "test/math.test.ts",
  "test/button.test.tsx",
  "test/math.test.js",
  "test/button.test.jsx",
  "test/math.test.mjs",
  "test/math.test.cjs",
  "test/math.test.mts",
  "test/math.test.cts",
  "test/lib/math.test.ts",
  "packages/ui/test/button.test.tsx",
  "apps/web/test/lib/math.test.ts",
  "packages\\ui\\test\\lib\\math.test.ts",
  "e2e/login.spec.ts",
  "e2e/auth/login.test.ts",
  "e2e/login.spec.mjs",
  "packages/ui/e2e/button.spec.tsx",
  "apps/web/e2e/auth/login.test.ts",
  "packages\\ui\\e2e\\login.spec.ts",
  "login.e2e.ts",
  "browser/login.e2e.ts",
  "packages/ui/button.e2e.tsx",
  "apps\\web\\browser\\login.e2e.ts",
];
const rejectedPaths = [
  "math.test.ts",
  "src/math.test.ts",
  "src/lib/math.test.ts",
  "src/button.test.tsx",
  "tests/math.test.ts",
  "__tests__/math.test.ts",
  "test-utils/math.test.ts",
  "test/math.spec.ts",
  "test/math.spec.mjs",
  "test/math.spec.cts",
  "src/math.spec.ts",
  "packages/ui/src/button.test.tsx",
  "packages/ui/tests/math.test.ts",
  "packages\\ui\\src\\math.test.ts",
  "packages\\ui\\__tests__\\math.spec.ts",
  "browser/login.spec.ts",
  "browser/login.e2e.spec.ts",
  "e2e-tests/login.spec.ts",
  "packages/ui/e2e-tests/login.test.ts",
];
const sourcePaths = [
  "src/test/math.test.ts",
  "src/lib/test/math.test.ts",
  "packages/ui/src/test/button.test.tsx",
  "test/src/math.test.ts",
  "packages/ui/test/src/math.test.ts",
  "packages\\ui\\src\\test\\math.test.ts",
  "src/login.e2e.ts",
  "src/e2e/login.spec.ts",
  "e2e/src/login.test.ts",
  "packages/ui/src/e2e/login.test.ts",
  "apps/web/src/browser/login.e2e.ts",
];

// The same patterns must match both native separators, including absolute CLI paths.
test("filename patterns support POSIX and Windows paths", () => {
  const options = rules.vitest["vitest/consistent-test-filename"][1];
  const detected = new RegExp(options.allTestPattern);
  const accepted = new RegExp(options.pattern);
  for (const filename of [...acceptedPaths, ...rejectedPaths]) {
    for (const candidate of [
      filename,
      `/repo/${filename}`,
      `C:\\repo\\${filename.replaceAll("/", "\\")}`,
    ]) {
      assert.equal(detected.test(candidate), true, candidate);
      assert.equal(accepted.test(candidate), acceptedPaths.includes(filename), candidate);
    }
  }
});

test("generated test policy matches the factory, including source-tree restrictions", async () => {
  const generated = JSON.parse(await readFile(path.join(root, "configs/vitest.json"), "utf8"));
  const factory = oxforge({ vitest: true, typeAware: false });
  assert.deepEqual(generated.rules, rules.vitest);
  assert.deepEqual(generated.overrides, factory.overrides);
  assert.equal(Object.hasOwn(oxforge(), "overrides"), false);
});

test("explicit consumer filename rules and overrides keep precedence", () => {
  const custom = ["error", { allTestPattern: "test", pattern: "custom" }];
  const override = { files: ["fixtures/**"], rules: { "vitest/consistent-test-filename": "off" } };
  const configured = oxforge({
    vitest: true,
    rules: { "vitest/consistent-test-filename": custom },
    overrides: [override],
  });
  assert.deepEqual(configured.rules["vitest/consistent-test-filename"], custom);
  assert.deepEqual(configured.overrides[0].rules["vitest/consistent-test-filename"], custom);
  assert.deepEqual(configured.overrides[1], override);
});

for (const mode of ["factory", "generated"]) {
  test(`${mode}: unit and end-to-end tests use their own filename conventions`, async (t) => {
    const valid = await lint(
      t,
      mode,
      Object.fromEntries(acceptedPaths.map((name) => [name, "void 0;"])),
    );
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    const invalid = await lint(
      t,
      mode,
      Object.fromEntries([...rejectedPaths, ...sourcePaths].map((name) => [name, "void 0;"])),
    );
    const failures = invalid.diagnostics.filter((item) =>
      item.code?.endsWith("(consistent-test-filename)"),
    );
    assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
    assert.equal(failures.length, rejectedPaths.length + sourcePaths.length, invalid.stdout);
  });

  test(`${mode}: conventional Playwright imports remain valid`, async (t) => {
    const source =
      'import { test, expect } from "@playwright/test"; test("loads", async ({ page }) => { await page.goto("/"); await expect(page).toHaveTitle("Home"); });';
    const result = await lint(t, mode, {
      "e2e/home.spec.ts": source,
      "browser/home.e2e.ts": source,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  test(`${mode}: a repository inside a parent src directory remains valid`, async (t) => {
    const result = await lint(
      t,
      mode,
      {
        "test/math.test.ts": "void 0;",
        "packages/ui/e2e/button.spec.tsx": "void 0;",
        "browser/login.e2e.ts": "void 0;",
      },
      "src/consumer",
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  test(`${mode}: helpers, fixtures, and ordinary source files keep their names`, async (t) => {
    const names = [
      "test/setup.ts",
      "test/helpers/request.ts",
      "test/fixtures/user.ts",
      "src/contest.ts",
      "src/test-utils.ts",
      "src/testing.ts",
      "src/specification.ts",
      "src/test.ts",
      "test/api.d.ts",
      "e2e/login.ts",
      "e2e/helpers/session.ts",
      "src/test/helpers.ts",
    ];
    const result = await lint(
      t,
      mode,
      Object.fromEntries(names.map((name) => [name, "export const value = 1;"])),
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  test(`${mode}: filename detection does not pretend to identify arbitrary test code`, async (t) => {
    // The filename rule cannot distinguish a helper from an unconventionally named test.
    const result = await lint(t, mode, {
      "src/checks.ts": validTest,
      "__tests__/legacy.ts": validTest,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  for (const [name, rule, source] of [
    [
      "Node test import",
      "no-import-node-test",
      'import { test } from "node:test"; test("wrong runner", () => {});',
    ],
    [
      "Node namespace import",
      "no-import-node-test",
      'import * as runner from "node:test"; runner.test("wrong runner", () => {});',
    ],
    [
      "conditional expectation",
      "no-conditional-expect",
      'test("conditional", () => { if (ready) { expect(value).toBe(1); } });',
    ],
    [
      "catch-only expectation",
      "no-conditional-expect",
      'test("catch only", async () => { try { await load(); } catch (error) { expect(error).toBeDefined(); } });',
    ],
    ["standalone expectation", "no-standalone-expect", "expect(1).toBe(1);"],
    [
      "duplicate title",
      "no-identical-title",
      'test("same", () => { expect(1).toBe(1); }); test("same", () => { expect(2).toBe(2); });',
    ],
    ["empty title", "valid-title", 'test("", () => { expect(1).toBe(1); });'],
    [
      "invalid suite callback",
      "valid-describe-callback",
      'describe("suite", (done) => { test("value", () => { expect(1).toBe(1); }); });',
    ],
    [
      "interpolated snapshot",
      "no-interpolation-in-snapshots",
      'test("snapshot", () => { expect(value).toMatchInlineSnapshot(`value: ${value}`); });',
    ],
    [
      "unspecified error",
      "require-to-throw-message",
      'test("error", () => { expect(() => fail()).toThrow(); });',
    ],
    ["focused test", "no-focused-tests", 'test.only("focused", () => { expect(1).toBe(1); });'],
    ["skipped test", "no-disabled-tests", 'test.skip("skipped", () => { expect(1).toBe(1); });'],
    [
      "unawaited assertion",
      "valid-expect",
      'test("async assertion", () => { expect(Promise.resolve(1)).resolves.toBe(1); });',
    ],
  ]) {
    test(`${mode}: rejects ${name}`, async (t) => {
      const imports =
        rule === "no-import-node-test" ? "" : 'import { describe, test, expect } from "vitest"; ';
      const result = await lint(t, mode, { "test/example.test.ts": imports + source });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.ok(
        result.diagnostics.some((item) => item.code?.endsWith(`(${rule})`)),
        result.stdout,
      );
    });
  }

  test(`${mode}: legitimate assertions and asynchronous Vitest contracts stay valid`, async (t) => {
    const result = await lint(t, mode, {
      "test/contracts.test.ts": `
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
function assertValue(value) { expect(value).toBe(1); }
beforeEach(async () => { await Promise.resolve(); });
afterEach(async () => { await Promise.resolve(); });
describe("async suite", async () => {
  await Promise.resolve();
  test.each([1, 2])("case %i", async (value) => {
    assert.equal(value, value);
    expect(value, "useful context").toBe(value);
    await expect(Promise.resolve(value), "async context").resolves.toBe(value);
    await expect(Promise.reject(new TypeError("invalid"))).rejects.toThrow(TypeError);
    expect(() => {}).not.toThrow();
    expect(() => { throw new Error("invalid"); }).toThrow(/invalid/);
    assertValue(1);
  });
});
describe.each([1, 2])("suite %i", (value) => {
  test("nested", () => { expect(value).toBe(value); });
});
`,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}
