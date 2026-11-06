/** @type {import("e2e").E2EConfig} */
export default {
  tests: "e2e/**/*.e2e.js",
  targets: [{ name: "cli", platform: "cli" }],
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporters: ["list", "junit"],
};
