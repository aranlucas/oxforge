import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { oxforge } from "../src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const lintBin = path.join(root, "node_modules/oxlint/bin/oxlint");
const categories = Object.fromEntries(
  ["correctness", "suspicious", "perf", "pedantic", "style", "restriction", "nursery"].map(
    (category) => [category, "off"],
  ),
);
const mixedReturn = `
export function maybe(value: boolean) {
  if (value) {
    return 1;
  }

  return;
}
`;
const optionalCleanup = `
type Effect = () => void | (() => void);
declare function useEffect(effect: Effect, dependencies: unknown[]): void;
declare const enabled: boolean;
useEffect(() => {
  if (!enabled) {
    return;
  }

  return () => {};
}, [enabled]);
`;

async function lint(t, config, source, filename) {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-return-policy-"));
  t.onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "src"));
  await writeFile(path.join(directory, ".oxlintrc.json"), JSON.stringify(config));
  await writeFile(
    path.join(directory, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { strict: true, allowJs: true, checkJs: true } }),
  );
  await writeFile(path.join(directory, filename), source);
  const result = spawnSync(process.execPath, [lintBin, filename, "--format", "json"], {
    cwd: directory,
    encoding: "utf8",
  });
  assert.ifError(result.error);
  assert.ok(result.status === 0 || result.status === 1, result.stdout + result.stderr);
  assert.match(result.stdout, /^\s*\{/, result.stdout + result.stderr);
  return JSON.parse(result.stdout).diagnostics;
}

for (const typeAware of [false, true]) {
  test(`factory explicitly disables return checking with typeAware=${typeAware}`, () => {
    for (const react of [false, true]) {
      const config = oxforge({ typeAware, react });
      assert.equal(config.rules["typescript/consistent-return"], "off");
    }
  });
}

for (const mode of ["factory", "base", "recommended", "react", "type-aware"]) {
  test(`${mode}: return checks stay disabled through inherited categories`, async (t) => {
    const config =
      mode === "factory"
        ? oxforge({ react: true })
        : {
            extends: [
              path.join(root, "configs/base.json"),
              path.join(root, `configs/${mode === "react" ? "recommended" : mode}.json`),
              ...(mode === "react"
                ? [
                    path.join(root, "configs/react.json"),
                    path.join(root, "configs/type-aware.json"),
                  ]
                : []),
            ],
            categories: { suspicious: "error", pedantic: "error" },
            options: { typeAware: true },
          };
    for (const [filename, source] of [
      ["src/sample.ts", mixedReturn],
      ["src/sample.tsx", optionalCleanup],
      ["src/sample.js", `/** @param {boolean} value */\n${mixedReturn.replace(": boolean", "")}`],
    ]) {
      const diagnostics = await lint(t, config, source, filename);
      assert.equal(
        diagnostics.some((diagnostic) => diagnostic.code?.includes("consistent-return")),
        false,
        JSON.stringify(diagnostics),
      );
    }
  });
}

for (const rule of ["typescript/consistent-return"]) {
  test(`${rule}: the fixture still detects an explicitly enabled rule`, async (t) => {
    const diagnostics = await lint(
      t,
      {
        plugins: ["typescript"],
        categories,
        options: { typeAware: true },
        rules: { [rule]: "error" },
      },
      mixedReturn,
      "src/sample.ts",
    );
    assert.equal(
      diagnostics.some((diagnostic) => diagnostic.code?.includes("consistent-return")),
      true,
    );
  });
}
