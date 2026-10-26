import assert from "node:assert/strict";
import { execa } from "execa";

// Native execFile cannot combine detached process groups with buffered limits.
// Execa already exists in the release toolchain and owns timeout, output limits
// and descendant cleanup; this fixture helper adds only a shared suite deadline
// and the expected failure status for lint diagnostics.
export async function packageCommand(
  command,
  args,
  { cwd, deadline, timeout = 30_000, expectedStatus = 0 },
) {
  const remaining = Math.min(timeout, deadline - performance.now());
  if (remaining <= 0) throw new Error("Package-test budget exhausted");

  const result = await execa(command, args, {
    cwd,
    timeout: Math.ceil(remaining),
    killSignal: "SIGKILL",
    killDescendants: true,
    maxBuffer: 2 * 1024 * 1024,
    stripFinalNewline: false,
    reject: false,
    env: { NODE_PATH: "" },
  });
  if (
    result.failed &&
    (result.exitCode !== expectedStatus || result.timedOut || result.isMaxBuffer)
  ) {
    throw result;
  }
  assert.equal(result.exitCode, expectedStatus, `Unexpected exit status: ${command}`);
  return { status: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}
