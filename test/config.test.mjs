import assert from "node:assert/strict";
import { test } from "vitest";
import { mkdir, mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { oxforge, rules } from "@aranlucas/oxforge";
import { format } from "@aranlucas/oxforge/format";

const root = fileURLToPath(new URL("..", import.meta.url));
const lintBin = path.join(root, "node_modules/oxlint/bin/oxlint");
const formatBin = path.join(root, "node_modules/oxfmt/bin/oxfmt");

function run(binary, args, cwd) {
  const result = spawnSync(process.execPath, [binary, ...args], { cwd, encoding: "utf8" });
  assert.ifError(result.error);
  return result;
}

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-test-"));
  t.onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, "package.json"), '{"type":"module"}\n');
  return directory;
}

async function lint(t, config, source, filename = "sample.ts") {
  const directory = await fixture(t);
  await writeFile(path.join(directory, ".oxlintrc.json"), JSON.stringify(config));
  await mkdir(path.dirname(path.join(directory, filename)), { recursive: true });
  await writeFile(path.join(directory, filename), source);
  return run(lintBin, [filename, "--format", "json"], directory);
}

const categoriesOff = {
  correctness: "off",
  suspicious: "off",
  perf: "off",
  pedantic: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
};

test("defaults combine all generic rules and strict type-aware policy", () => {
  const config = oxforge();
  assert.equal(config.options.typeAware, true);
  assert.equal(config.options.maxWarnings, 0);
  assert.equal(config.categories.pedantic, "error");
  assert.equal(oxforge({ pedantic: false }).categories.pedantic, "off");
  assert.equal(config.rules["unicorn/filename-case"], "error");
  assert.equal(config.rules["oxforge/no-inline-types"], "error");
  assert.equal(Object.keys(rules.antiSlop).length, 18);
  assert.deepEqual(config.rules["typescript/no-floating-promises"], [
    "error",
    { checkThenables: true, ignoreVoid: false },
  ]);
  assert.equal(config.plugins.includes("react"), false);
});

test("consumer overrides win while plugin and ignore arrays stay additive", () => {
  const config = oxforge({
    typeAware: false,
    nextjs: true,
    vitest: true,
    allowTypeGuards: true,
    categories: { perf: "off" },
    env: { node: true },
    plugins: ["jest"],
    ignorePatterns: ["generated/**"],
    rules: { "eslint/no-console": "off" },
    overrides: [{ files: ["**/*.test.ts"], rules: { "anti-slop/no-runtime-typeof": "off" } }],
  });
  assert.equal(config.categories.correctness, "error");
  assert.equal(config.categories.perf, "off");
  assert.equal(config.env.browser, true);
  assert.equal(config.env.node, true);
  assert.equal(config.options.typeAware, false);
  assert.equal(config.rules["typescript/no-floating-promises"], undefined);
  assert.equal(config.rules["eslint/no-console"], "off");
  assert.ok(
    config.plugins.includes("nextjs") &&
      config.plugins.includes("vitest") &&
      config.plugins.includes("jest"),
  );
  assert.ok(
    config.ignorePatterns.includes("**/dist/**") && config.ignorePatterns.includes("generated/**"),
  );
  assert.deepEqual(config.rules["anti-slop/no-runtime-typeof"], [
    "error",
    { allowInTypeGuards: true },
  ]);
  assert.equal(config.overrides.length, 2);
  assert.deepEqual(config.overrides[1], {
    files: ["**/*.test.ts"],
    rules: { "anti-slop/no-runtime-typeof": "off" },
  });
});

test("configs do not share mutable nested rule options", () => {
  const first = oxforge();
  first.rules["import/no-unassigned-import"][1].allow.push("**/env");
  first.ignorePatterns.push("everything/**");
  const second = oxforge();
  assert.deepEqual(second.rules["import/no-unassigned-import"][1].allow, ["**/*.css"]);
  assert.equal(second.ignorePatterns.includes("everything/**"), false);
});

test("optional plugin settings preserve stylesheet and UI paths with local settings", () => {
  const config = oxforge({
    tailwind: { stylesheet: "app/globals.css", settings: { timeout: 120000 } },
    shadcn: { ui: "@/components/ui" },
    settings: {
      tailwindcss: { timeout: 300000 },
      shadcn: { componentImports: ["^@/shared/ui/"] },
      react: { version: "19.3.0" },
    },
  });
  assert.equal(config.settings.tailwindcss.entryPoint, "app/globals.css");
  assert.equal(config.settings.tailwindcss.timeout, 300000);
  assert.equal(config.settings.shadcn.ui, "@/components/ui");
  assert.deepEqual(config.settings.shadcn.componentImports, ["^@/shared/ui/"]);
  assert.equal(config.settings.react.version, "19.3.0");
  assert.throws(() => oxforge({ tailwind: {} }), /tailwind.stylesheet/);
});

test("every native and optional preset loads in Oxlint", async (t) => {
  const config = oxforge({
    typeAware: false,
    nextjs: true,
    reactPerf: true,
    vitest: true,
    pedantic: true,
    sizeLimits: true,
    maintainability: true,
    tailwind: { stylesheet: "styles.css" },
    shadcn: { ui: "@/components/ui" },
  });
  const directory = await fixture(t);
  await writeFile(path.join(directory, ".oxlintrc.json"), JSON.stringify(config));
  await writeFile(path.join(directory, "styles.css"), '@import "tailwindcss";\n');
  await writeFile(path.join(directory, "sample.ts"), "export const answer = 42;\n");
  const result = run(lintBin, ["sample.ts"], directory);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("undefined feature options preserve defaults without leaking into native configuration", () => {
  assert.deepEqual(
    oxforge({
      react: undefined,
      nextjs: undefined,
      reactPerf: undefined,
      vitest: undefined,
      typeAware: undefined,
      namedTypes: undefined,
      allowTypeGuards: undefined,
      pedantic: undefined,
      sizeLimits: undefined,
      maintainability: undefined,
      tailwind: undefined,
      shadcn: undefined,
    }),
    oxforge(),
  );
});

test("maintainability is opt-in and consumer rule overrides remain authoritative", () => {
  assert.equal(oxforge().rules["eslint/complexity"], undefined);
  const config = oxforge({
    maintainability: true,
    rules: { "eslint/complexity": ["error", { max: 5 }] },
  });
  assert.equal(Object.hasOwn(config, "maintainability"), false);
  assert.deepEqual(config.rules["eslint/complexity"], ["error", { max: 5 }]);
  assert.deepEqual(config.rules["eslint/max-depth"], ["error", 3]);
});

for (const mode of ["factory", "generated"]) {
  test(`${mode}: maintainability accepts complexity 9 and reports complexity 10`, async (t) => {
    const configuration =
      mode === "factory"
        ? oxforge({ typeAware: false, maintainability: true, categories: categoriesOff })
        : {
            extends: [path.join(root, "configs/maintainability.json")],
            categories: categoriesOff,
          };
    const branches = Array.from(
      { length: 9 },
      (_, index) => `if (flags[${index}]) { return ${index}; }`,
    );
    const source = `export function nine(flags: boolean[]) { ${branches.slice(0, 8).join(" ")} return -1; }
export function ten(flags: boolean[]) { ${branches.join(" ")} return -1; }`;
    const result = await lint(t, configuration, source);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const diagnostics = JSON.parse(result.stdout).diagnostics.filter(
      (diagnostic) => diagnostic.code === "eslint(complexity)",
    );
    assert.equal(diagnostics.length, 1, result.stdout);
    assert.match(diagnostics[0].message, /`ten` has a complexity of 10\. Maximum allowed is 9/);
  });

  test(`${mode}: maintainability distinguishes depth 3 from depth 4`, async (t) => {
    const configuration =
      mode === "factory"
        ? oxforge({ typeAware: false, maintainability: true, categories: categoriesOff })
        : {
            extends: [path.join(root, "configs/maintainability.json")],
            categories: categoriesOff,
          };
    const source = `export function three(flags: boolean[]) {
  if (flags[0]) { if (flags[1]) { if (flags[2]) { return 1; } } } return 0;
}
export function four(flags: boolean[]) {
  if (flags[0]) { if (flags[1]) { if (flags[2]) { if (flags[3]) { return 1; } } } } return 0;
}`;
    const result = await lint(t, configuration, source);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const diagnostics = JSON.parse(result.stdout).diagnostics.filter(
      (diagnostic) => diagnostic.code === "eslint(max-depth)",
    );
    assert.equal(diagnostics.length, 1, result.stdout);
    assert.equal(diagnostics[0].labels[0].span.line, 5);
  });
}

test("named types reject inline signatures and function-local declarations", async (t) => {
  const result = await lint(
    t,
    {
      plugins: [],
      categories: categoriesOff,
      jsPlugins: oxforge({ typeAware: false }).jsPlugins.slice(1),
      rules: { "oxforge/no-inline-types": "error" },
    },
    "export function read(value: { id: string }): [string, number] { type Local = { id: string }; return [value.id, 1]; }\n",
  );
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.diagnostics.length, 3);
  assert.match(result.stdout, /named module-level/);
});

test("named module and namespace declarations are valid", async (t) => {
  const result = await lint(
    t,
    {
      plugins: [],
      categories: categoriesOff,
      jsPlugins: oxforge({ typeAware: false }).jsPlugins.slice(1),
      rules: { "oxforge/no-inline-types": "error" },
    },
    "export type Item = { id: string; nested: { count: number } };\nexport type Pair = [Item, number];\nexport namespace Domain { export interface Entry { id: string } }\n",
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("anti-slop dependency reports actual assertion violations", async (t) => {
  const config = oxforge({ typeAware: false, namedTypes: false, categories: categoriesOff });
  const result = await lint(t, config, "export const value = 1 as unknown as string;\n");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /no-chained-type-assertions/);
});

for (const mode of ["factory", "generated"]) {
  test(`${mode}: anti-slop keeps single-line bindings grouped and separates leading comments`, async (t) => {
    const config =
      mode === "factory"
        ? oxforge({ typeAware: false, namedTypes: false, categories: categoriesOff })
        : { extends: [path.join(root, "configs/base.json")], categories: categoriesOff };
    const grouped = await lint(t, config, "export const first = 1;\nexport const second = 2;\n");
    assert.equal(grouped.status, 0, grouped.stdout + grouped.stderr);

    const documented = await lint(
      t,
      config,
      "export const first = 1;\n/** Starts a new group. */\nexport const second = 2;\n",
    );
    assert.equal(documented.status, 1, documented.stdout + documented.stderr);
    assert.match(documented.stdout, /require-readable-spacing/);
  });
}

test("type-aware preset catches floating promises using the installed checker", async (t) => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, ".oxlintrc.json"), JSON.stringify(oxforge()));
  await writeFile(
    path.join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "ES2024",
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
      include: ["*.ts"],
    }),
  );
  await writeFile(path.join(directory, "sample.ts"), "Promise.resolve(1);\n");
  const result = run(lintBin, ["sample.ts", "--format", "json"], directory);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /no-floating-promises/);
});

test("Oxfmt loads the shared config and honors local formatting exceptions", async (t) => {
  const directory = await fixture(t);
  await writeFile(
    path.join(directory, "oxfmt.config.ts"),
    `import { format } from ${JSON.stringify(import.meta.resolve("@aranlucas/oxforge/format"))};\nexport default format({ semi: false, singleQuote: true, printWidth: 120 });\n`,
  );
  await writeFile(path.join(directory, "sample.ts"), 'export const message="hello";\n');
  const result = run(formatBin, ["--write", "sample.ts"], directory);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(
    await readFile(path.join(directory, "sample.ts"), "utf8"),
    "export const message = 'hello'\n",
  );
  const config = format({ ignorePatterns: ["generated/**"] });
  assert.equal(config.printWidth, 100);
  assert.ok(
    config.ignorePatterns.includes("generated/**") && config.ignorePatterns.includes("**/dist/**"),
  );
});

test("initializer creates discoverable configs and protects existing configs", async (t) => {
  const directory = await fixture(t);
  const binary = path.join(root, "bin/oxforge.js");
  const result = run(binary, ["init", "--next", "--vitest"], directory);
  assert.equal(result.status, 0, result.stderr);
  const config = await readFile(path.join(directory, ".oxlintrc.json"), "utf8");
  const parsed = JSON.parse(config);
  assert.equal(parsed.options.typeAware, true);
  assert.ok(parsed.extends.some((preset) => preset.endsWith("nextjs.json")));
  assert.ok(parsed.extends.some((preset) => preset.endsWith("vitest.json")));
  const again = run(binary, ["init"], directory);
  assert.equal(again.status, 1);
  assert.equal(await readFile(path.join(directory, ".oxlintrc.json"), "utf8"), config);
});

test("initializer rejects unknown options before writing", async (t) => {
  const directory = await fixture(t);
  const result = run(path.join(root, "bin/oxforge.js"), ["init", "--typo"], directory);
  assert.equal(result.status, 1);
  await assert.rejects(readFile(path.join(directory, ".oxlintrc.json")), { code: "ENOENT" });
});

for (const mode of ["factory", "generated"]) {
  test(`${mode}: Vitest accepts assertion messages and rejects malformed expectations`, async (t) => {
    const factory = oxforge({ typeAware: false, vitest: true });
    const config =
      mode === "factory"
        ? {
            plugins: ["vitest"],
            categories: categoriesOff,
            rules: { "vitest/valid-expect": factory.rules["vitest/valid-expect"] },
          }
        : {
            extends: [path.join(root, "configs/vitest.json")],
            categories: categoriesOff,
          };
    // Vitest documents the second message argument: https://vitest.dev/api/expect.html
    const valid = await lint(
      t,
      config,
      'import { test, expect } from "vitest"; test("assertion messages", async () => { expect(42).toBe(42); expect(42, "answer context").toBe(42); await expect(Promise.resolve(42), "async context").resolves.toBe(42); });',
      "test/sample.test.ts",
    );
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);

    for (const assertion of [
      "expect().toBe(42);",
      'expect(42, "context", "extra").toBe(42);',
      'expect(42, "context");',
      'expect(Promise.resolve(42), "context").resolves.toBe(42);',
    ]) {
      const invalid = await lint(
        t,
        config,
        `import { test, expect } from "vitest"; test("invalid expectation", async () => { ${assertion} });`,
        "test/sample.test.ts",
      );
      assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
      assert.match(invalid.stdout, /valid-expect/);
    }
  });
}
