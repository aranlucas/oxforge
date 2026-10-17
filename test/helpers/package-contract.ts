import type { OxlintConfig } from "oxlint";
import oxforge from "@aranlucas/oxforge";
import format from "@aranlucas/oxforge/format";
import plugin from "@aranlucas/oxforge/plugin";

const config: OxlintConfig = oxforge({ nextjs: true, vitest: true });
void config;
void plugin.rules;
// @ts-expect-error -- the installed declaration must reject nonboolean preset options.
oxforge({ nextjs: "yes" });
// @ts-expect-error -- enabled Tailwind linting requires a consumer stylesheet path.
oxforge({ tailwind: {} });
// @ts-expect-error -- the installed formatter declaration must retain native option types.
format({ printWidth: "wide" });
