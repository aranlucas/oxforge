#!/usr/bin/env node
import { access, writeFile } from "node:fs/promises";
import path from "node:path";

const [command, ...args] = process.argv.slice(2);

const flags = new Set(args);

const allowed = new Set(["--react", "--next", "--vitest", "--no-type-aware"]);

async function exists(file) {
  try {
    await access(file);

    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function init() {
  for (const flag of flags) {
    if (!allowed.has(flag)) {
      throw new Error(`Unknown option: ${flag}`);
    }
  }

  const lintNames = [".oxlintrc.json", ".oxlintrc.jsonc", "oxlint.config.ts", "oxlint.config.mts"];
  const formatNames = [".oxfmtrc.json", ".oxfmtrc.jsonc", "oxfmt.config.ts", "oxfmt.config.mts"];
  const configNames = [...lintNames, ...formatNames];
  const present = await Promise.all(configNames.map((name) => exists(path.resolve(name))));
  const conflicts = configNames.filter((_, index) => present[index]);

  if (conflicts.length) {
    throw new Error(
      `Existing config: ${conflicts.join(", ")}. Follow the README migration steps before initializing.`,
    );
  }

  const options = [];

  if (flags.has("--next")) {
    options.push("  nextjs: true,");
  } else if (flags.has("--react")) {
    options.push("  react: true,");
  }

  if (flags.has("--vitest")) {
    options.push("  vitest: true,");
  }

  if (flags.has("--no-type-aware")) {
    options.push("  typeAware: false,");
  }

  const lint = `import { oxforge } from "@aranlucas/oxforge";\n\nexport default oxforge({\n${options.join("\n")}\n});\n`;

  const format =
    'import { format } from "@aranlucas/oxforge/format";\n\nexport default format();\n';

  await writeFile("oxlint.config.ts", lint, { flag: "wx" });
  await writeFile("oxfmt.config.ts", format, { flag: "wx" });
  process.stdout.write(
    "Created oxlint.config.ts and oxfmt.config.ts. Run pnpm exec oxlint and pnpm exec oxfmt --check.\n",
  );
}

try {
  if (command === "init") {
    await init();
  } else if (!command || command === "--help" || command === "help") {
    process.stdout.write(
      "Oxforge — strict types, readable code, no slop.\n\nUsage: oxforge init [--react | --next] [--vitest] [--no-type-aware]\n\nInstall: pnpm add -D @aranlucas/oxforge oxlint oxfmt oxlint-tsgolint\n",
    );
  } else {
    throw new Error(`Unknown command: ${command}. Run oxforge --help.`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
