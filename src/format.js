import { ignorePatterns } from "./index.js";

export const tailwindSortConfig = {
  functions: ["cn", "clsx", "cva", "twMerge", "twJoin"],
  attributes: ["classNames", "containerClassName", "labelClassName"],
};

export const formatConfig = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  trailingComma: "all",
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  singleAttributePerLine: false,
  endOfLine: "lf",
  proseWrap: "preserve",
  quoteProps: "as-needed",
  objectWrap: "preserve",
  sortPackageJson: true,
  ignorePatterns,
};

export function format(options = {}) {
  const config = {
    ...formatConfig,
    ...options,
    ignorePatterns: [...ignorePatterns, ...(options.ignorePatterns ?? [])],
  };

  if (options.sortTailwindcss === true) {
    config.sortTailwindcss = tailwindSortConfig;
  } else if (options.sortTailwindcss) {
    config.sortTailwindcss = { ...tailwindSortConfig, ...options.sortTailwindcss };
  }

  return structuredClone(config);
}

export default format;
