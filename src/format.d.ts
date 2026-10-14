import type { FormatConfig, SortTailwindcssConfig } from "oxfmt";

/** Shared exact-match helpers and JSX attributes; no project paths or implicit opt-in. */
export declare const tailwindSortConfig: Required<
  Pick<SortTailwindcssConfig, "functions" | "attributes">
>;

export declare const formatConfig: FormatConfig;

/** Opting into sortTailwindcss adds shared defaults. Explicit local fields replace them. */
export declare function format(options?: FormatConfig): FormatConfig;

export default format;
