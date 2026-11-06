export const nativePresets = {
  react: { plugins: ["react", "jsx-a11y"], env: { browser: true } },
  nextjs: { extends: ["./react.json"], plugins: ["nextjs"] },
  reactPerf: { extends: ["./react.json"], plugins: ["react-perf"] },
  vitest: { plugins: ["vitest"] },
};
