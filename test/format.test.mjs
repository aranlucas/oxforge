import assert from "node:assert/strict";
import { test } from "vitest";
import { format, formatConfig, tailwindSortConfig } from "../src/format.js";
import staticConfig, {
  tailwindSortConfig as staticTailwindSortConfig,
} from "../src/format-config.js";

test("Tailwind sorting is opt-in for both formatter entrypoints", () => {
  assert.equal(staticConfig, formatConfig);
  assert.equal(staticTailwindSortConfig, tailwindSortConfig);
  assert.equal(Object.hasOwn(formatConfig, "sortTailwindcss"), false);
  assert.equal(Object.hasOwn(format(), "sortTailwindcss"), false);
  assert.equal(format({ sortTailwindcss: false }).sortTailwindcss, false);
  assert.equal(Object.hasOwn(tailwindSortConfig, "stylesheet"), false);
  assert.equal(Object.hasOwn(tailwindSortConfig, "config"), false);
});

test("enabling Tailwind sorting uses the shared helpers and attributes", () => {
  const expected = {
    functions: ["cn", "clsx", "cva", "twMerge", "twJoin"],
    attributes: ["classNames", "containerClassName", "labelClassName"],
  };
  assert.deepEqual(tailwindSortConfig, expected);
  assert.deepEqual(format({ sortTailwindcss: true }).sortTailwindcss, expected);
  assert.deepEqual(format({ sortTailwindcss: {} }).sortTailwindcss, expected);
  assert.deepEqual(
    format({ sortTailwindcss: { stylesheet: "src/app/index.css" } }).sortTailwindcss,
    { ...expected, stylesheet: "src/app/index.css" },
  );
});

test("local Tailwind fields replace shared defaults and formatting ignores remain additive", () => {
  const options = {
    semi: false,
    ignorePatterns: ["catalog/**", "src/generated/**"],
    sortTailwindcss: {
      config: "config/tailwind.cjs",
      functions: ["customClasses"],
      attributes: [],
      preserveDuplicates: true,
      preserveWhitespace: true,
    },
  };
  const snapshot = structuredClone(options);
  const config = format(options);
  assert.deepEqual(config.sortTailwindcss, options.sortTailwindcss);
  assert.equal(config.semi, false);
  assert.deepEqual(config.ignorePatterns, [
    ...formatConfig.ignorePatterns,
    ...options.ignorePatterns,
  ]);
  assert.deepEqual(options, snapshot);
});

test("Tailwind results do not share mutable arrays with options or other calls", () => {
  const options = { sortTailwindcss: { functions: ["customClasses"] } };
  const first = format(options);
  first.sortTailwindcss.functions.push("onlyFirst");
  first.sortTailwindcss.attributes.push("onlyFirstClassName");
  assert.deepEqual(options.sortTailwindcss.functions, ["customClasses"]);
  assert.deepEqual(format(options).sortTailwindcss.functions, ["customClasses"]);
  assert.deepEqual(format({ sortTailwindcss: true }).sortTailwindcss, tailwindSortConfig);
  assert.deepEqual(tailwindSortConfig.attributes, [
    "classNames",
    "containerClassName",
    "labelClassName",
  ]);
});
