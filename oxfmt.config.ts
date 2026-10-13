import config from "./src/format-config.js";

const configWithIgnores = {
  ...config,
  ignorePatterns: [...(config.ignorePatterns ?? []), "dist/**", "docs/projects.json"],
};

export default configWithIgnores;
