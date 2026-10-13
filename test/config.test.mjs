import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { oxforge, rules } from "../src/index.js";
import { format } from "../src/format.js";

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
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, "package.json"), '{"type":"module"}\n');
  return directory;
}

async function lint(t, config, source, filename = "sample.ts") {
  const directory = await fixture(t);
  await writeFile(path.join(directory, ".oxlintrc.json"), JSON.stringify(config));
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
  assert.equal(config.overrides.length, 1);
});

test("configs do not share mutable nested rule options", () => {
  const first = oxforge();
  first.rules["eslint/eqeqeq"][2].null = "always";
  first.ignorePatterns.push("everything/**");
  const second = oxforge();
  assert.equal(second.rules["eslint/eqeqeq"][2].null, "ignore");
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
    `import { format } from ${JSON.stringify(new URL("../src/format.js", import.meta.url).href)};\nexport default format({ semi: false, singleQuote: true, printWidth: 120 });\n`,
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
