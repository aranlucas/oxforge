import { ignorePatterns } from "./index.js";

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
  return structuredClone({
    ...formatConfig,
    ...options,
    ignorePatterns: [...ignorePatterns, ...(options.ignorePatterns ?? [])],
  });
}

export default format;
