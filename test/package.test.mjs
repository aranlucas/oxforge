import assert from "node:assert/strict";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packageCommand } from "./helpers/package-command.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("installed tarball", () => {
  let directory;
  let consumer;
  let deadline;

  beforeAll(async () => {
    deadline = performance.now() + 240_000;
    directory = await mkdtemp(path.join(tmpdir(), "oxforge-package-"));
    consumer = path.join(directory, "consumer");
    const archive = path.join(directory, "oxforge.tgz");
    // prepack builds only: it must never call this test (or prepublishOnly).
    await packageCommand("pnpm", ["pack", "--out", archive], {
      cwd: root,
      deadline,
      timeout: 60_000,
    });
    await mkdir(consumer);
    const { packageManager } = JSON.parse(await readFile(path.join(root, "package.json")));
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
      // Use the versions installed by the repository's frozen lockfile, not new ranges.
      const installed = JSON.parse(
        await readFile(path.join(root, "node_modules", name, "package.json")),
      );
      devDependencies[name] = installed.version;
    }
    await writeFile(
      path.join(consumer, "package.json"),
      JSON.stringify({
        name: "oxforge-package-smoke",
        private: true,
        type: "module",
        packageManager,
        devDependencies,
      }),
    );
    await writeFile(path.join(consumer, "pnpm-workspace.yaml"), "autoInstallPeers: false\n");
    await packageCommand(
      "pnpm",
      ["install", "--ignore-scripts", "--prefer-offline", "--no-frozen-lockfile"],
      { cwd: consumer, deadline, timeout: 120_000 },
    );
    await copyFile(
      new URL("./helpers/package-consumer.mjs", import.meta.url),
      path.join(consumer, "smoke.mjs"),
    );
    // Reuse the full existing public type contract against the installed declarations.
    await copyFile(new URL("./api.test.ts", import.meta.url), path.join(consumer, "api.ts"));
    await copyFile(
      new URL("./helpers/package-contract.ts", import.meta.url),
      path.join(consumer, "contract.ts"),
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

  // Runs even if packing, installation, or an assertion fails.
  afterAll(async () => {
    if (directory) {
      await rm(directory, { recursive: true, force: true });
      process.stdout.write("Removed temporary tarball and consumer.\n");
    }
  }, 30_000);

  beforeEach(async () => {
    await writeFile(path.join(consumer, "sample.ts"), "export const answer=42\n");
  });

  test("loads public JS/JSON exports and resolves plugins inside the consumer", async () => {
    await expect(
      packageCommand("pnpm", ["exec", "node", "smoke.mjs"], { cwd: consumer, deadline }),
    ).resolves.toMatchObject({ status: 0 });
  });

  test("compiles the copied API and negative type contracts with strict installed declarations", async () => {
    await expect(
      packageCommand("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], {
        cwd: consumer,
        deadline,
      }),
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
      const printed = await packageCommand(
        "pnpm",
        ["exec", "oxlint", "--print-config", "sample.ts"],
        { cwd: consumer, deadline },
      );
      const inherited = JSON.parse(printed.stdout);
      for (const plugin of ["react", "nextjs", "vitest", "typescript", "import", "promise"]) {
        assert.ok(inherited.plugins.includes(plugin), `Missing inherited plugin: ${plugin}`);
      }
      await packageCommand("pnpm", ["exec", "oxlint", "sample.ts"], { cwd: consumer, deadline });
    });

    test("formats through the installed formatter configuration", async () => {
      await packageCommand("pnpm", ["exec", "oxfmt", "--write", "sample.ts"], {
        cwd: consumer,
        deadline,
      });
      assert.equal(
        await readFile(path.join(consumer, "sample.ts"), "utf8"),
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
      for (const rule of rules) {
        assert.ok(
          diagnostics.some((diagnostic) => diagnostic.code?.includes(rule)),
          result.stdout,
        );
      }
    });
  });
});
