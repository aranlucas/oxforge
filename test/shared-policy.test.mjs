import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { oxforge } from "../src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const lintBin = path.join(root, "node_modules/oxlint/bin/oxlint");
const readonlyRule = "prefer-readonly-parameter-types";

function config(mode, framework, typeAware = true) {
  if (mode === "factory") {
    return oxforge({ typeAware, ...(framework ? { [framework]: true } : {}) });
  }
  return {
    extends: [
      path.join(root, "configs", typeAware ? "recommended.json" : "base.json"),
      ...(framework ? [path.join(root, "configs", `${framework}.json`)] : []),
    ],
    options: { typeAware },
  };
}

async function check(t, configuration, files) {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-policy-"));
  t.onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const fixtureFiles = {
    "package.json": '{"type":"module"}',
    "tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true, target: "ES2024", module: "NodeNext", jsx: "preserve" },
      include: ["*.ts", "*.tsx"],
    }),
    ".oxlintrc.json": JSON.stringify(configuration),
    ...files,
  };
  for (const [filename, contents] of Object.entries(fixtureFiles)) {
    const target = path.join(directory, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  const result = spawnSync(process.execPath, [lintBin, "sample.tsx", "--format", "json"], {
    cwd: directory,
    encoding: "utf8",
  });
  assert.ifError(result.error);
  assert.ok(result.status === 0 || result.status === 1, result.stdout + result.stderr);
  const output = JSON.parse(result.stdout);
  assert.ok(Array.isArray(output.diagnostics), result.stdout);
  return output.diagnostics;
}

function count(diagnostics, rule) {
  return diagnostics.filter((diagnostic) => diagnostic.code?.endsWith(`(${rule})`)).length;
}

for (const mode of ["factory", "generated"]) {
  test(`${mode}: strict equality includes null boundaries`, async (t) => {
    const diagnostics = await check(t, config(mode), {
      "sample.tsx": `export function absent(value: string | null | undefined) { return value == null; }
export function explicit(value: string | null | undefined) { return value === null || value === undefined; }`,
    });
    assert.equal(count(diagnostics, "eqeqeq"), 1, JSON.stringify(diagnostics));
  });

  test(`${mode}: native unused-name defaults are preserved accurately`, async (t) => {
    const diagnostics = await check(t, config(mode), {
      "sample.tsx": `const discarded = 1;
const _unused = 1;
export function read(_parameter: number, _: number) { return 1; }`,
    });
    assert.equal(count(diagnostics, "no-unused-vars"), 2, JSON.stringify(diagnostics));
  });

  test(`${mode}: bare CSS imports are allowed but env imports are checked`, async (t) => {
    const diagnostics = await check(t, config(mode), {
      "sample.tsx": 'import "./styles.css";\nimport "./env";\nexport const answer = 42;',
      "styles.css": "",
      "env.ts": "export const environment = 1;",
    });
    assert.equal(count(diagnostics, "no-unassigned-import"), 1, JSON.stringify(diagnostics));
  });

  test(`${mode}: readonly contracts cover mutable arrays, objects and URL helpers`, async (t) => {
    const diagnostics = await check(t, config(mode), {
      "sample.tsx": `type Mutable = { value: string };
type Immutable = Readonly<Mutable>;
export function mutable(value: Mutable) { return value.value; }
export function array(values: string[]) { return values.length; }
export function url(value: URL) { return value.href; }
export function immutable(value: Immutable) { return value.value; }
export function readonlyArray(values: readonly string[]) { return values.length; }
export function href(value: string) { return value; }
export const inferred = [{ value: "ok" }].map(value => value.value);
export function promise(value: Promise<string>) { return value; }`,
    });
    assert.equal(count(diagnostics, readonlyRule), 3, JSON.stringify(diagnostics));
  });

  test(`${mode}: React exceptions match package declarations, not application type names`, async (t) => {
    const files = {
      "node_modules/@types/react/package.json":
        '{"name":"@types/react","version":"1.0.0","types":"index.d.ts"}',
      "node_modules/@types/react/index.d.ts": `export type ReactNode = { children: string[] };
export interface KeyboardEvent { key: string; }`,
      "sample.tsx": `import type { ReactNode, KeyboardEvent } from "react";
export function node(value: ReactNode) { return value; }
export function keyboard(value: KeyboardEvent) { return value.key; }`,
    };
    const configuration = config(mode, "react");
    const diagnostics = await check(t, configuration, files);
    assert.equal(count(diagnostics, readonlyRule), 0, JSON.stringify(diagnostics));
    const withoutExceptions = await check(
      t,
      {
        ...configuration,
        rules: {
          ...configuration.rules,
          "typescript/prefer-readonly-parameter-types": ["error", { ignoreInferredTypes: true }],
        },
      },
      files,
    );
    assert.equal(count(withoutExceptions, readonlyRule), 2, JSON.stringify(withoutExceptions));
    const collisions = await check(t, config(mode), {
      "sample.tsx": `type ReactNode = { children: string[] };
type KeyboardEvent = { key: string };
type Promise = { value: string };
export function node(value: ReactNode) { return value; }
export function keyboard(value: KeyboardEvent) { return value.key; }
export function promise(value: Promise) { return value.value; }`,
    });
    assert.equal(count(collisions, readonlyRule), 3, JSON.stringify(collisions));
  });

  for (const framework of [undefined, "react", "nextjs"]) {
    test(`${mode}: ${framework ?? "base"} does not run readonly checks when type-aware is disabled`, async (t) => {
      const diagnostics = await check(t, config(mode, framework, false), {
        "sample.tsx": "export function read(values: string[]) { return values.length; }",
      });
      assert.equal(count(diagnostics, readonlyRule), 0, JSON.stringify(diagnostics));
    });
  }

  for (const framework of ["react", "nextjs"]) {
    test(`${mode}: ${framework} rejects arbitrary constant exports beside components`, async (t) => {
      const diagnostics = await check(t, config(mode, framework, false), {
        "sample.tsx": "export const helper = 42;\nexport function Component() { return <div />; }",
      });
      assert.equal(count(diagnostics, "only-export-components"), 1, JSON.stringify(diagnostics));
    });
  }

  test(`${mode}: Next.js keeps framework metadata and route configuration exports`, async (t) => {
    const files = {
      "sample.tsx": `export const metadata = { title: "Example" };
export const viewport = { width: "device-width" };
export const dynamic = "force-static";
export const revalidate = 60;
export function generateMetadata() { return {}; }
export function generateStaticParams() { return []; }
export default function Page() { return <div />; }`,
    };
    const next = await check(t, config(mode, "nextjs", false), files);
    assert.equal(count(next, "only-export-components"), 0, JSON.stringify(next));
    const react = await check(t, config(mode, "react", false), files);
    assert.equal(count(react, "only-export-components"), 6, JSON.stringify(react));
  });
}
