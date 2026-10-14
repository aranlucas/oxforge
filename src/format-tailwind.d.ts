import type { FormatConfig, SortTailwindcssConfig } from "oxfmt";

/** Full base formatting with shared Tailwind sorting enabled; project paths stay local. */
export interface TailwindFormatConfig extends FormatConfig {
  sortTailwindcss: SortTailwindcssConfig;
}

export declare const formatTailwindConfig: TailwindFormatConfig;

export default formatTailwindConfig;
