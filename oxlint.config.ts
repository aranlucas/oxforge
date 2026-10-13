import { oxforge } from "./src/index.js";

export default oxforge({
  typeAware: false,
  ignorePatterns: ["dist/**", "docs/**", "test/**"],
});
