import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Vitest owns cases and fixture lifetime. Native command timeouts do not kill
// detached pnpm descendants; retain the shared budget, output bound and group kill.
export async function packageCommand(
  command,
  args,
  { cwd, deadline, timeout = 30_000, expectedStatus = 0 },
) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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
      () => stop(`${command} ${args.join(" ")} exceeded its package-test budget`),
      Math.max(1, Math.min(timeout, deadline - performance.now())),
    );
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length + stderr.length > 4 * 1024 * 1024 && !failure) {
        stop("Package test output exceeded 4 MiB");
      }
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
      if (stdout.length + stderr.length > 4 * 1024 * 1024 && !failure) {
        stop("Package test output exceeded 4 MiB");
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
    `${command} ${args.join(" ")}\n${result.stdout}${result.stderr}`,
  );
  process.stdout.write(result.stdout + result.stderr);
  return result;
}
