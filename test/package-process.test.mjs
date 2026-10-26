import assert from "node:assert/strict";
import { expect, test } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { packageCommand } from "./helpers/package-command.mjs";

test("package commands retain output and reject unexpected exits or spawn failures", async () => {
  const options = { cwd: tmpdir(), deadline: performance.now() + 30_000 };
  const result = await packageCommand(
    process.execPath,
    ["-e", 'process.stdout.write("out"); process.stderr.write("err"); process.exitCode = 7;'],
    { ...options, expectedStatus: 7 },
  );
  expect(result).toEqual({ status: 7, stdout: "out", stderr: "err" });
  await expect(
    packageCommand(
      process.execPath,
      ["-e", 'console.error("broken command"); process.exitCode = 7;'],
      options,
    ),
  ).rejects.toThrow(/broken command/);
  await expect(
    packageCommand(process.execPath, ["-e", ""], { ...options, expectedStatus: 1 }),
  ).rejects.toThrow(/Unexpected exit status/);
  await expect(packageCommand("oxforge-missing-command", [], options)).rejects.toThrow(/ENOENT/);
});

test("an expired shared deadline prevents a command from starting", async () => {
  await expect(
    packageCommand("oxforge-missing-command", [], {
      cwd: tmpdir(),
      deadline: performance.now() - 1,
    }),
  ).rejects.toThrow(/budget exhausted/);
});

function kill(pid) {
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    assert.equal(error.code, "ESRCH");
  }
}

function running(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    assert.equal(error.code, "ESRCH");
    return false;
  }
}

// This suite targets the macOS/Linux process-group contract used by package CI.
test.runIf(process.platform !== "win32").each([
  ["command timeout", 1_000, 240_000, "wait", { timedOut: true }],
  ["shared budget", 30_000, 1_000, "wait", { timedOut: true }],
  ["stdout cap", 30_000, 240_000, "stdout", { isMaxBuffer: true }],
  ["stderr cap", 30_000, 240_000, "stderr", { isMaxBuffer: true }],
  ["exited parent with lingering descendant", 1_000, 240_000, "exit", { timedOut: true }],
])("%s cleans up inherited-pipe descendants", async (name, timeout, budget, mode, failure) => {
  const directory = await mkdtemp(path.join(tmpdir(), "oxforge-package-command-"));
  const pidFile = path.join(directory, "pids.json");
  const code = `
    const { spawn } = require("node:child_process");
    const { writeFileSync } = require("node:fs");
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "inherit" });
    child.on("spawn", () => {
      writeFileSync(${JSON.stringify(pidFile)}, JSON.stringify([process.pid, child.pid]));
      const mode = ${JSON.stringify(mode)};
      if (mode === "exit") process.exit(0);
      if (mode === "stdout" || mode === "stderr") {
        for (let index = 0; index < 80; index++) process[mode].write("x".repeat(65536));
      }
    });
    setInterval(() => {}, 1000);
  `;
  try {
    const result = packageCommand(process.execPath, ["-e", code], {
      cwd: directory,
      deadline: performance.now() + budget,
      timeout,
    });
    await expect(result).rejects.toMatchObject(failure);
    const pids = JSON.parse(await readFile(pidFile, "utf8"));
    for (const pid of pids) {
      await expect
        .poll(() => running(pid), { timeout: 2_000, message: `${name} leaked PID ${pid}` })
        .toBe(false);
    }
  } finally {
    // Failure in the regression test must not leave its probe processes behind.
    const pids = JSON.parse(
      await readFile(pidFile, "utf8").catch((error) => {
        if (error.code === "ENOENT") return "[]";
        throw error;
      }),
    );
    for (const pid of pids) kill(pid);
    await rm(directory, { recursive: true, force: true });
  }
});
