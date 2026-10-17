import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = await mkdtemp(path.join(tmpdir(), "oxforge-package-"));
const consumer = path.join(directory, "consumer");
const started = performance.now();
const deadline = started + 240_000;

async function pnpm(args, cwd, timeout = 30_000, expectedStatus = 0) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, {
      cwd,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      // Never inherit checkout module lookup paths into the fresh consumer.
      env: { ...process.env, NODE_PATH: "" },
    });
    let stdout = "";
    let stderr = "";
    let failure;
    function stop(message) {
      failure = new Error(message);
      if (process.platform === "win32") {
        child.kill("SIGKILL");
      } else {
        // Kill the process group, including native tools spawned by pnpm.
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") {
            throw error;
          }
        }
      }
    }
    const timer = setTimeout(
      () => stop(`pnpm ${args.join(" ")} exceeded its package-smoke budget`),
      Math.max(1, Math.min(timeout, deadline - performance.now())),
    );
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length + stderr.length > 4 * 1024 * 1024 && !failure) {
        stop("Package smoke output exceeded 4 MiB");
      }
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
      if (stdout.length + stderr.length > 4 * 1024 * 1024 && !failure) {
        stop("Package smoke output exceeded 4 MiB");
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      if (failure) {
        reject(failure);
      } else {
        resolve({ status, stdout, stderr });
      }
    });
  });
  assert.equal(
    result.status,
    expectedStatus,
    `pnpm ${args.join(" ")}\n${result.stdout}${result.stderr}`,
  );
  process.stdout.write(result.stdout + result.stderr);
  return result;
}

try {
  const archive = path.join(directory, "oxforge.tgz");
  // prepack builds only: it must never call this test (or prepublishOnly).
  await pnpm(["pack", "--out", archive], root, 60_000);
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
  await pnpm(
    ["install", "--ignore-scripts", "--prefer-offline", "--no-frozen-lockfile"],
    consumer,
    120_000,
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
  await pnpm(["exec", "node", "smoke.mjs"], consumer);
  await pnpm(["exec", "tsc", "-p", "tsconfig.json"], consumer);
  await pnpm(["exec", "oxforge", "init", "--next", "--vitest"], consumer);
  const printed = await pnpm(["exec", "oxlint", "--print-config", "sample.ts"], consumer);
  const inherited = JSON.parse(printed.stdout);
  for (const plugin of ["react", "nextjs", "vitest", "typescript", "import", "promise"]) {
    assert.ok(inherited.plugins.includes(plugin), `Missing inherited plugin: ${plugin}`);
  }
  await pnpm(["exec", "oxlint", "sample.ts"], consumer);
  await pnpm(["exec", "oxfmt", "--write", "sample.ts"], consumer);
  assert.equal(
    await readFile(path.join(consumer, "sample.ts"), "utf8"),
    "export const answer = 42;\n",
  );

  for (const [source, rules] of [
    [
      "export function read(value: { readonly id: string }) { return value.id; }\nexport const value = 1 as unknown as string;\n",
      ["no-inline-types", "no-chained-type-assertions"],
    ],
    ["Promise.resolve(1);\n", ["no-floating-promises"]],
  ]) {
    await writeFile(path.join(consumer, "sample.ts"), source);
    const result = await pnpm(
      ["exec", "oxlint", "sample.ts", "--format", "json"],
      consumer,
      30_000,
      1,
    );
    const diagnostics = JSON.parse(result.stdout).diagnostics;
    for (const rule of rules) {
      assert.ok(
        diagnostics.some((diagnostic) => diagnostic.code?.includes(rule)),
        result.stdout,
      );
    }
  }
  process.stdout.write(
    `Installed tarball smoke passed in ${((performance.now() - started) / 1000).toFixed(1)}s.\n`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
  process.stdout.write("Removed temporary tarball and consumer.\n");
}
