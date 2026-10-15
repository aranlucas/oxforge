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
const cases = [
  [
    "control-has-associated-label",
    '<button type="button" />',
    '<button type="button" aria-label="Save" />',
  ],
  ["heading-has-content", "<h1 />", "<h1>Title</h1>"],
  [
    "jsx-no-target-blank",
    '<a href="https://example.com" target="_blank">Example</a>',
    '<a href="https://example.com" target="_blank" rel="noreferrer">Example</a>',
  ],
  ["no-unsafe", "UNSAFE_componentWillMount", "componentDidMount"],
];

async function lint(t, mode, framework, source) {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-react-policy-"));
  t.onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const factory = oxforge({
    [framework === "react-perf" ? "reactPerf" : framework]: true,
    typeAware: false,
  });
  const configuration =
    mode === "factory"
      ? {
          plugins: factory.plugins,
          categories,
          rules: Object.fromEntries(
            Object.entries(factory.rules).filter(
              ([name]) =>
                name.startsWith("react/") ||
                name.startsWith("jsx-a11y/") ||
                name.startsWith("nextjs/") ||
                name.startsWith("react-perf/"),
            ),
          ),
        }
      : { extends: [path.join(root, `configs/${framework}.json`)], categories };
  await mkdir(path.join(directory, "components"));
  await writeFile(path.join(directory, ".oxlintrc.json"), JSON.stringify(configuration));
  await writeFile(path.join(directory, "components/example.tsx"), source);
  const result = spawnSync(
    process.execPath,
    [lintBin, "components/example.tsx", "--format", "json"],
    { cwd: directory, encoding: "utf8" },
  );
  assert.ifError(result.error);
  assert.ok(result.status === 0 || result.status === 1, result.stdout + result.stderr);
  return { ...result, diagnostics: JSON.parse(result.stdout).diagnostics };
}

test("React factory and generated preset share the stricter rule severities", async () => {
  const generated = JSON.parse(await readFile(path.join(root, "configs/react.json"), "utf8"));
  assert.deepEqual(generated.rules, rules.react);
  for (const name of [
    "jsx-a11y/control-has-associated-label",
    "jsx-a11y/heading-has-content",
    "react/jsx-no-target-blank",
    "react/no-unsafe",
  ]) {
    assert.equal(rules.react[name], "error");
    for (const framework of ["react", "nextjs", "reactPerf"]) {
      assert.equal(oxforge({ [framework]: true }).rules[name], "error");
    }
  }
});

for (const mode of ["factory", "generated"]) {
  for (const framework of ["react", "nextjs", "react-perf"]) {
    for (const [name, invalid, valid] of cases) {
      test(`${mode} ${framework}: ${name} rejects violations and accepts safe counterparts`, async (t) => {
        const source = (value) =>
          name === "no-unsafe"
            ? `import React from "react"; export class Example extends React.Component { ${value}() {} render() { return null; } }`
            : `export function Example() { return ${value}; }`;
        const bad = await lint(t, mode, framework, source(invalid));
        assert.equal(bad.status, 1, bad.stdout + bad.stderr);
        assert.equal(
          bad.diagnostics.filter((item) => item.code?.endsWith(`(${name})`)).length,
          1,
          bad.stdout,
        );
        const good = await lint(t, mode, framework, source(valid));
        assert.equal(good.status, 0, good.stdout + good.stderr);
      });
    }
  }
}
