import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const helpers = ["cn", "clsx", "cva", "twMerge", "twJoin"];

const attributes = ["className", "classNames", "containerClassName", "labelClassName"];

const unsorted = "text-white p-4 bg-signal flex";

const sorted = "flex bg-signal p-4 text-white";

const ignored = "export const ignored=  1\n";

const source = [
  ...helpers.map((helper) => `export const ${helper}Result = ${helper}("${unsorted}");`),
  ...attributes.map(
    (attribute) => `export const ${attribute}View = <Panel ${attribute}="${unsorted}" />;`,
  ),
  `export const untouched = otherClasses("${unsorted}");`,
  `export const untouchedView = <Panel otherClassName="${unsorted}" />;`,
].join("\n");

function successful(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

function verifySorting(output) {
  for (const helper of helpers) {
    assert.ok(output.includes(`${helper}("${sorted}")`), output);
  }

  for (const attribute of attributes) {
    assert.ok(output.includes(`${attribute}="${sorted}"`), output);
  }

  assert.ok(output.includes(`otherClasses("${unsorted}")`), output);
  assert.ok(output.includes(`otherClassName="${unsorted}"`), output);
}

async function testConfig(directory, pnpm, config, name) {
  const relativeWeb = `${name}/web`;
  const web = path.join(directory, relativeWeb);
  await mkdir(path.join(web, "src/app"), { recursive: true });
  await mkdir(path.join(web, "catalog"));
  await mkdir(path.join(web, "dist"));
  await writeFile(
    path.join(web, "src/app/index.css"),
    '@import "tailwindcss";\n@theme { --color-signal: #ff00ff; }\n',
  );
  await writeFile(path.join(web, "catalog/ignored.ts"), ignored);
  await writeFile(path.join(web, "dist/ignored.ts"), ignored);
  await writeFile(path.join(web, "oxfmt.config.ts"), config);
  await writeFile(path.join(web, "sample.tsx"), source);
  // Run from the parent to prove the stylesheet is relative to the consumer config.
  const args = ["exec", "oxfmt", "--config", `${relativeWeb}/oxfmt.config.ts`];
  successful(pnpm([...args, "--write", relativeWeb], directory));
  const output = await readFile(path.join(web, "sample.tsx"), "utf8");
  verifySorting(output);
  assert.equal(await readFile(path.join(web, "catalog/ignored.ts"), "utf8"), ignored);
  assert.equal(await readFile(path.join(web, "dist/ignored.ts"), "utf8"), ignored);
  successful(pnpm([...args, "--check", relativeWeb], directory));

  return output;
}

async function testToggle(directory, pnpm, sortTailwindcss) {
  const web = path.join(directory, `toggle-${sortTailwindcss}`);
  await mkdir(web);
  await writeFile(
    path.join(web, "oxfmt.config.ts"),
    `import { format } from "@aranlucas/oxforge/format";
export default format({ sortTailwindcss: ${sortTailwindcss} });`,
  );
  await writeFile(path.join(web, "sample.tsx"), 'export const classes = cn("p-4 flex");\n');
  successful(pnpm(["exec", "oxfmt", "--write", "sample.tsx"], web));
  assert.equal(
    await readFile(path.join(web, "sample.tsx"), "utf8"),
    `export const classes = cn("${sortTailwindcss ? "flex p-4" : "p-4 flex"}");\n`,
  );
}

export async function testTailwindFormatting(directory, pnpm, root) {
  await writeFile(
    path.join(directory, "test/tailwind-api.test.ts"),
    `
import type { FormatConfig } from "oxfmt";
import tailwind, { formatTailwindConfig } from "@aranlucas/oxforge/format-tailwind";
const direct: FormatConfig = tailwind;
const customized: FormatConfig = { ...formatTailwindConfig, sortTailwindcss: {
  ...formatTailwindConfig.sortTailwindcss, stylesheet: "src/app/index.css",
} };
export { direct, customized };
`,
  );
  await writeFile(
    path.join(directory, "tsconfig.format.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: "ES2024",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        skipLibCheck: false,
      },
      include: ["test/tailwind-api.test.ts"],
    }),
  );
  successful(
    pnpm(["exec", "tsc", "--project", path.join(directory, "tsconfig.format.json")], root),
  );
  const configs = [
    // The original Set & Signal shape is the output-equivalence baseline.
    `import base from "@aranlucas/oxforge/format-config";
export default { ...base, sortTailwindcss: {
  stylesheet: "src/app/index.css",
  functions: ${JSON.stringify(helpers)},
  attributes: ["classNames", "containerClassName", "labelClassName"],
}, ignorePatterns: [...base.ignorePatterns, "catalog/**"] };`,
    `import base, { tailwindSortConfig } from "@aranlucas/oxforge/format-config";
export default { ...base, sortTailwindcss: {
  ...tailwindSortConfig, stylesheet: "src/app/index.css",
}, ignorePatterns: [...base.ignorePatterns, "catalog/**"] };`,
    `import { format } from "@aranlucas/oxforge/format";
export default format({ sortTailwindcss: { stylesheet: "src/app/index.css" },
  ignorePatterns: ["catalog/**"] });`,
    `import base from "@aranlucas/oxforge/format-tailwind";
export default { ...base, sortTailwindcss: {
  ...base.sortTailwindcss, stylesheet: "src/app/index.css",
}, ignorePatterns: [...base.ignorePatterns, "catalog/**"] };`,
  ];

  const outputs = await Promise.all(
    configs.map((config, index) => testConfig(directory, pnpm, config, `case-${index}`)),
  );

  assert.equal(outputs[1], outputs[0]);
  assert.equal(outputs[2], outputs[0]);
  assert.equal(outputs[3], outputs[0]);
  await Promise.all([true, false].map((enabled) => testToggle(directory, pnpm, enabled)));
  const direct = path.join(directory, "default-tailwind-preset");
  await mkdir(direct);
  await writeFile(
    path.join(direct, "oxfmt.config.ts"),
    'export { default } from "@aranlucas/oxforge/format-tailwind";\n',
  );
  await writeFile(path.join(direct, "sample.tsx"), 'export const classes = cn("p-4 flex");\n');
  successful(pnpm(["exec", "oxfmt", "--write", "sample.tsx"], direct));
  assert.equal(
    await readFile(path.join(direct, "sample.tsx"), "utf8"),
    'export const classes = cn("flex p-4");\n',
  );
  successful(pnpm(["exec", "oxfmt", "--check", "sample.tsx"], direct));
}
