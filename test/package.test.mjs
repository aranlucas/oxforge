import assert from "node:assert/strict";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packageCommand } from "./helpers/package-command.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const presets = [
  "base",
  "recommended",
  "type-aware",
  "react",
  "nextjs",
  "react-perf",
  "vitest",
  "tailwind",
  "shadcn",
  "size-limits",
  "maintainability",
];
const ruleSets = [
  "base",
  "anti-slop",
  "type-aware",
  "react",
  "nextjs",
  "react-perf",
  "vitest",
  "tailwind",
  "shadcn",
  "size-limits",
  "maintainability",
];

describe("installed tarball", () => {
  let directory;
  let consumer;
  let deadline;

  beforeAll(async () => {
    deadline = performance.now() + 240_000;
    directory = await mkdtemp(path.join(tmpdir(), "oxforge-package-"));
    consumer = path.join(directory, "consumer");
    const archive = path.join(directory, "oxforge.tgz");
    // Native prepack builds only, so packing cannot recurse into this suite.
    await packageCommand("pnpm", ["pack", "--out", archive], {
      cwd: root,
      deadline,
      timeout: 60_000,
    });
    await mkdir(consumer);
    const { packageManager } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    const devDependencies = { "@aranlucas/oxforge": `file:${archive}` };
    for (const name of [
      "oxlint",
      "oxfmt",
      "oxlint-tsgolint",
      "oxlint-tailwindcss",
      "@shadcn/lint",
      "typescript",
      "@types/node",
    ]) {
      // Resolve peers from the repository's frozen install, never floating ranges.
      const installed = JSON.parse(
        await readFile(path.join(root, "node_modules", name, "package.json"), "utf8"),
      );
      devDependencies[name] = installed.version;
    }
    await writeFile(
      path.join(consumer, "package.json"),
      JSON.stringify({
        name: "oxforge-package-consumer",
        private: true,
        type: "module",
        packageManager,
        devDependencies,
      }),
    );
    await writeFile(
      path.join(consumer, "pnpm-workspace.yaml"),
      "autoInstallPeers: false\nnodeLinker: isolated\nvirtualStoreDir: node_modules/.pnpm\n",
    );
    await packageCommand(
      "pnpm",
      ["install", "--ignore-scripts", "--prefer-offline", "--no-frozen-lockfile"],
      { cwd: consumer, deadline, timeout: 120_000 },
    );
    // Compile the real public API contract against installed declarations.
    await copyFile(new URL("./api.test.ts", import.meta.url), path.join(consumer, "api.ts"));
    await writeFile(
      path.join(consumer, "contract.ts"),
      `
      import type { OxlintConfig } from "oxlint";
      import oxforge from "@aranlucas/oxforge";
      import format from "@aranlucas/oxforge/format";
      import plugin from "@aranlucas/oxforge/plugin";
      const config: OxlintConfig = oxforge({ nextjs: true, vitest: true, maintainability: true });
      void config;
      void plugin.rules;
      // @ts-expect-error -- presets retain boolean option types.
      oxforge({ nextjs: "yes" });
      // @ts-expect-error -- maintainability is an opt-in boolean.
      oxforge({ maintainability: "yes" });
      // @ts-expect-error -- Tailwind lint requires a stylesheet.
      oxforge({ tailwind: {} });
      // @ts-expect-error -- formatter retains native option types.
      format({ printWidth: "wide" });
    `,
    );
    await writeFile(
      path.join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2024",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: false,
          verbatimModuleSyntax: true,
          noEmit: true,
        },
        include: ["api.ts", "contract.ts", "sample.ts"],
      }),
    );
  });

  afterAll(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  }, 30_000);

  beforeEach(async () => {
    await writeFile(path.join(consumer, "sample.ts"), "export const answer=42\n");
  });

  test("public JS/JSON exports and plugins resolve inside the physical consumer", async () => {
    // A native Node process resolves from the consumer, outside Vitest/Vite's
    // checkout resolver. This probe returns data; assertions stay in Vitest.
    const probe = `
      import { createRequire } from "node:module";
      import { realpath } from "node:fs/promises";
      import { dirname } from "node:path";
      import { fileURLToPath } from "node:url";
      import oxforge from "@aranlucas/oxforge";
      import format from "@aranlucas/oxforge/format";
      import formatConfig from "@aranlucas/oxforge/format-config";
      import tailwind from "@aranlucas/oxforge/format-tailwind";
      import plugin from "@aranlucas/oxforge/plugin";
      const require = createRequire(import.meta.url);
      const specifiers = ["", "/format", "/format-config", "/format-tailwind", "/plugin"].map((suffix) => "@aranlucas/oxforge" + suffix);
      const config = oxforge({ nextjs: true, vitest: true, maintainability: true, tailwind: { stylesheet: "styles.css" }, shadcn: { ui: "@/components/ui" } });
      console.log(JSON.stringify({
        installed: await realpath(dirname(require.resolve("@aranlucas/oxforge/package.json"))),
        exports: await Promise.all(specifiers.map((name) => realpath(fileURLToPath(import.meta.resolve(name))))),
        presets: Object.fromEntries(${JSON.stringify(presets)}.map((name) => [name, require("@aranlucas/oxforge/configs/" + name)])),
        rules: Object.fromEntries(${JSON.stringify(ruleSets)}.map((name) => [name, require("@aranlucas/oxforge/rules/" + name)])),
        plugins: await Promise.all(config.jsPlugins.map((entry) => realpath(entry.specifier))),
        namedTypes: Boolean(plugin.rules["no-inline-types"]),
        printWidth: format().printWidth,
        staticPrintWidth: formatConfig.printWidth,
        tailwindFunctions: tailwind.sortTailwindcss.functions,
        complexity: config.rules["eslint/complexity"],
      }));
    `;
    const result = await packageCommand(
      process.execPath,
      ["--input-type=module", "--eval", probe],
      { cwd: consumer, deadline },
    );
    const loaded = JSON.parse(result.stdout);
    const physicalConsumer = await realpath(consumer);
    expect(loaded.installed.startsWith(`${physicalConsumer}${path.sep}`)).toBe(true);
    for (const resolved of loaded.exports)
      expect(resolved.startsWith(`${loaded.installed}${path.sep}`)).toBe(true);
    for (const resolved of loaded.plugins)
      expect(resolved.startsWith(`${physicalConsumer}${path.sep}`)).toBe(true);
    for (const name of presets)
      assert.ok(loaded.presets[name].rules || loaded.presets[name].extends, name);
    for (const name of ruleSets) expect(Object.keys(loaded.rules[name]).length).toBeGreaterThan(0);
    expect(loaded.namedTypes).toBe(true);
    expect(loaded.printWidth).toBe(loaded.staticPrintWidth);
    expect(loaded.tailwindFunctions).toContain("cn");
    expect(loaded.complexity).toEqual(["error", { max: 9, variant: "classic" }]);
  });

  test("installed declarations accept the public API and reject invalid options", async () => {
    await expect(
      packageCommand("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], { cwd: consumer, deadline }),
    ).resolves.toMatchObject({ status: 0 });
  });

  describe("initialized consumer", () => {
    beforeAll(async () => {
      await packageCommand("pnpm", ["exec", "oxforge", "init", "--next", "--vitest"], {
        cwd: consumer,
        deadline,
      });
    });

    test("inherits the installed Next, React, Vitest and native presets", async () => {
      const result = await packageCommand(
        "pnpm",
        ["exec", "oxlint", "--print-config", "sample.ts"],
        { cwd: consumer, deadline },
      );
      const config = JSON.parse(result.stdout);
      for (const plugin of ["react", "nextjs", "vitest", "typescript", "import", "promise"])
        expect(config.plugins).toContain(plugin);
      await expect(
        packageCommand("pnpm", ["exec", "oxlint", "sample.ts"], { cwd: consumer, deadline }),
      ).resolves.toMatchObject({ status: 0 });
    });

    test("formats through the installed formatter configuration", async () => {
      await packageCommand("pnpm", ["exec", "oxfmt", "--write", "sample.ts"], {
        cwd: consumer,
        deadline,
      });
      expect(await readFile(path.join(consumer, "sample.ts"), "utf8")).toBe(
        "export const answer = 42;\n",
      );
    });

    test.each([
      [
        "custom plugin",
        "export function read(value: { readonly id: string }) { return value.id; }\nexport const value = 1 as unknown as string;\n",
        ["no-inline-types", "no-chained-type-assertions"],
      ],
      ["type-aware checker", "Promise.resolve(1);\n", ["no-floating-promises"]],
    ])("reports real diagnostics from the installed %s", async (_name, source, rules) => {
      await writeFile(path.join(consumer, "sample.ts"), source);
      const result = await packageCommand(
        "pnpm",
        ["exec", "oxlint", "sample.ts", "--format", "json"],
        { cwd: consumer, deadline, expectedStatus: 1 },
      );
      const diagnostics = JSON.parse(result.stdout).diagnostics;
      for (const rule of rules)
        expect(diagnostics.some((diagnostic) => diagnostic.code?.includes(rule))).toBe(true);
    });
  });
});
