import type { OxlintConfig } from "oxlint";

export type TailwindOptions = {
  stylesheet: string;
  settings?: NonNullable<OxlintConfig["settings"]>["tailwindcss"];
};

export type OxforgeOptions = Omit<OxlintConfig, "extends"> & {
  react?: boolean;
  nextjs?: boolean;
  reactPerf?: boolean;
  vitest?: boolean;
  typeAware?: boolean;
  namedTypes?: boolean;
  allowTypeGuards?: boolean;
  pedantic?: boolean;
  sizeLimits?: boolean;
  maintainability?: boolean;
  tailwind?: false | TailwindOptions;
  shadcn?: false | NonNullable<OxlintConfig["settings"]>["shadcn"];
};

export declare const rules: Readonly<
  Record<
    | "base"
    | "antiSlop"
    | "typeAware"
    | "react"
    | "nextjs"
    | "reactPerf"
    | "vitest"
    | "tailwind"
    | "shadcn"
    | "sizeLimits"
    | "maintainability",
    NonNullable<OxlintConfig["rules"]>
  >
>;

export declare const ignorePatterns: string[];

export declare function oxforge(options?: OxforgeOptions): OxlintConfig;

export default oxforge;
