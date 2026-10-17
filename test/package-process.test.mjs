import assert from "node:assert/strict";
import { expect, test } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { packageCommand } from "./helpers/package-command.mjs";

test("package commands preserve output and reject unexpected exit status", async () => {
  const options = { cwd: tmpdir(), deadline: performance.now() + 30_000 };
  const result = await packageCommand(
    process.execPath,
    ["-e", 'process.stdout.write("out"); process.stderr.write("err"); process.exitCode = 7;'],
    { ...options, expectedStatus: 7 },
  );
  assert.equal(result.stdout, "out");
  assert.equal(result.stderr, "err");
  await assert.rejects(
    packageCommand(
      process.execPath,
      ["-e", 'console.error("broken command"); process.exitCode = 7;'],
      options,
    ),
    /broken command/,
  );
});

test.each([
  ["command timeout", 1_000, 240_000, false, /package-test budget/],
  ["shared budget", 30_000, 1_000, false, /package-test budget/],
  ["output cap", 30_000, 240_000, true, /output exceeded 4 MiB/],
])(
  "%s kills the package command and its descendant",
  async (name, timeout, budget, flood, message) => {
    const directory = await mkdtemp(path.join(tmpdir(), "oxforge-package-command-"));
    const pidFile = path.join(directory, "pids.json");
    const code = `
    const { spawn } = require("node:child_process");
    const { writeFileSync } = require("node:fs");
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "inherit" });
    child.on("spawn", () => {
      writeFileSync(${JSON.stringify(pidFile)}, JSON.stringify([process.pid, child.pid]));
      if (${flood}) {
        for (let index = 0; index < 80; index++) process.stdout.write("x".repeat(65536));
      }
    });
    setInterval(() => {}, 1000);
  `;
    try {
      await assert.rejects(
        packageCommand(process.execPath, ["-e", code], {
          cwd: directory,
          deadline: performance.now() + budget,
          timeout,
        }),
        message,
      );
      const pids = JSON.parse(await readFile(pidFile, "utf8"));
      for (const pid of pids) {
        // Group SIGKILL is synchronous; OS reaping of an orphaned descendant is not.
        await expect
          .poll(
            () => {
              try {
                process.kill(pid, 0);
                return true;
              } catch (error) {
                assert.equal(error.code, "ESRCH");
                return false;
              }
            },
            { timeout: 2_000, message: `${name} leaked PID ${pid}` },
          )
          .toBe(false);
      }
    } finally {
      // A regression must not leave the probe's own processes behind.
      const pids = JSON.parse(await readFile(pidFile, "utf8").catch(() => "[]"));
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGKILL");
        } catch (error) {
          assert.equal(error.code, "ESRCH");
        }
      }
      await rm(directory, { recursive: true, force: true });
    }
  },
);
