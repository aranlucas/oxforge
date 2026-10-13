import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parse, printParseErrorCode } from "jsonc-parser";

const root = path.resolve(process.argv[2] ?? "..");

const excluded = new Set([
  "node_modules",
  ".git",
  "codex",
  "worktrees",
  ".agents",
  ".codex",
  ".claude",
  ".venv",
  "venv",
  "vendor",
  "dist",
  "build",
  "target",
  ".next",
  ".expo",
  "coverage",
  "oxforge",
]);

const configNames =
  /^(?:\.oxlint.*\.jsonc?|\.oxfmt.*\.jsonc?|oxlint\.config\.[cm]?ts|oxfmt\.config\.[cm]?ts|eslint\.config\.[cm]?[jt]s|\.prettierrc(?:\.json)?|prettier\.config\.[cm]?[jt]s)$/;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);

      if (entry.isDirectory() && !excluded.has(entry.name)) {
        return walk(absolute);
      }

      if (
        entry.isFile() &&
        (configNames.test(entry.name) || absolute.endsWith("packages/oxlint-config/base.json"))
      ) {
        return [absolute];
      }

      return [];
    }),
  );

  return files.flat();
}

async function auditProject(entry) {
  if (!entry.isDirectory() || excluded.has(entry.name) || entry.name.startsWith(".")) {
    return [];
  }

  const directory = path.join(root, entry.name);
  let remote = "";

  try {
    remote = execFileSync("git", ["-C", directory, "remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    /* Directories without git are still counted. */
  }

  const files = (await walk(directory)).toSorted();

  const configs = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, "utf8");

      const kind = file.includes("oxlint")
        ? "oxlint"
        : file.includes("oxfmt")
          ? "oxfmt"
          : file.includes("eslint")
            ? "eslint"
            : "prettier";

      const row = { path: path.relative(root, file), kind };

      if (
        file.endsWith(".json") ||
        file.endsWith(".jsonc") ||
        path.basename(file) === ".prettierrc"
      ) {
        const errors = [];
        row.config = parse(content, errors, { allowTrailingComma: true });

        if (errors.length) {
          throw new Error(
            `${row.path}: ${errors.map((error) => printParseErrorCode(error.error)).join(", ")}`,
          );
        }
      } else {
        row.note = "Executable config inventoried; review source without executing it.";
      }

      return row;
    }),
  );

  return [{ name: entry.name, owned: /github\.com[:/]aranlucas\//.test(remote), configs }];
}

const projectEntries = await readdir(root, { withFileTypes: true });

const projectResults = await Promise.all(projectEntries.map((entry) => auditProject(entry)));

const projects = projectResults.flat().toSorted((a, b) => a.name.localeCompare(b.name));

const inventory = {
  date: "2026-10-13",
  scope:
    "Primary local project directories; dependency, build, and temporary worktree directories excluded.",
  projects,
};

await mkdir("docs", { recursive: true });

await writeFile("docs/projects.json", `${JSON.stringify(inventory, null, 2)}\n`);

const ownConfigs = projects
  .filter((project) => project.owned)
  .flatMap((project) => project.configs);

const counts = new Map();

for (const row of ownConfigs.filter((configRow) => configRow.kind === "oxlint")) {
  for (const [rule, value] of Object.entries(row.config?.rules ?? {})) {
    const canonical = rule.startsWith("react-hooks/")
      ? rule.replace("react-hooks/", "react/")
      : rule.includes("/")
        ? rule
        : `eslint/${rule}`;

    const variants = counts.get(canonical) ?? new Map();
    const key = JSON.stringify(value);
    variants.set(key, (variants.get(key) ?? 0) + 1);
    counts.set(canonical, variants);
  }
}

const lines = [
  "# Project inventory",
  "",
  `Audited ${projects.length} local project directories on ${inventory.date}, including ${projects.filter((project) => project.owned).length} owned Git repositories. Temporary Codex checkouts and dependencies are excluded so repeated copies do not distort the policy.`,
  "",
  `Found ${ownConfigs.filter((row) => row.kind === "oxlint").length} Oxlint configurations and ${ownConfigs.filter((row) => row.kind === "oxfmt").length} Oxfmt configurations in owned projects. JSONC comments and trailing commas are parsed. Executable ESLint configurations are inventoried without executing arbitrary project code.`,
  "",
  "## Projects",
  "",
  "| Project | Ownership | Configuration files |",
  "| --- | --- | --- |",
  ...projects.map(
    (project) =>
      `| ${project.name} | ${project.owned ? "Owned" : "Other/local"} | ${project.configs.map((row) => `\`${row.path.slice(project.name.length + 1)}\``).join(", ") || "No JS lint/format config"} |`,
  ),
  "",
  "## Explicit rule variants",
  "",
  "Names are normalized to Oxlint's native namespaces. This includes explicit disabled rules; category-enabled defaults are recorded in projects.json. Counts reflect configurations, including nested configurations, rather than unique projects. Project-specific exceptions and settings are preserved in the inventory for migration.",
  "",
  "| Rule | Observed configuration (count) |",
  "| --- | --- |",
  ...[...counts]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(
      ([rule, variants]) =>
        `| \`${rule}\` | ${[...variants].map(([value, count]) => `\`${value.replaceAll("|", "\\|")}\` (${count})`).join("; ")} |`,
    ),
  "",
  "## Reproduce",
  "",
  "Run `pnpm audit:projects /path/to/Projects`. The raw snapshot is in [projects.json](projects.json). It contains config data, not application source or credentials.",
  "",
];

await writeFile("docs/inventory.md", lines.join("\n"));

process.stdout.write(
  `Audited ${projects.length} projects; recorded ${counts.size} distinct explicit Oxlint rules.\n`,
);
