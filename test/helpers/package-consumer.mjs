import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import oxforge from "@aranlucas/oxforge";
import format from "@aranlucas/oxforge/format";
import formatConfig from "@aranlucas/oxforge/format-config";
import tailwindConfig from "@aranlucas/oxforge/format-tailwind";
import plugin from "@aranlucas/oxforge/plugin";

const require = createRequire(import.meta.url);
const consumer = await realpath(process.cwd());
const installed = await realpath(path.dirname(require.resolve("@aranlucas/oxforge/package.json")));
assert.ok(installed.startsWith(`${consumer}${path.sep}`), `Package escaped consumer: ${installed}`);
for (const subpath of ["", "/format", "/format-config", "/format-tailwind", "/plugin"]) {
  const resolved = await realpath(
    fileURLToPath(import.meta.resolve(`@aranlucas/oxforge${subpath}`)),
  );
  assert.ok(resolved.startsWith(`${installed}${path.sep}`), `Export escaped tarball: ${resolved}`);
}

// Fixed public names catch missing wildcard-export files; enumerating shipped files would not.
for (const name of [
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
]) {
  assert.ok(
    require(`@aranlucas/oxforge/configs/${name}`).rules ||
      require(`@aranlucas/oxforge/configs/${name}`).extends,
  );
}
for (const name of [
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
]) {
  assert.ok(Object.keys(require(`@aranlucas/oxforge/rules/${name}`)).length > 0);
}
assert.ok(plugin.rules["no-inline-types"]);
const config = oxforge({
  nextjs: true,
  vitest: true,
  tailwind: { stylesheet: "styles.css" },
  shadcn: { ui: "@/components/ui" },
});
for (const entry of config.jsPlugins) {
  const resolved = await realpath(entry.specifier);
  assert.ok(resolved.startsWith(`${consumer}${path.sep}`), `Plugin escaped consumer: ${resolved}`);
}
assert.equal(format().printWidth, formatConfig.printWidth);
assert.ok(tailwindConfig.sortTailwindcss.functions.includes("cn"));
await writeFile("sample.ts", "export const answer=42\n");
process.stdout.write(
  "Installed public exports, JSON presets/rules, and plugin resolution passed.\n",
);
