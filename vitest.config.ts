import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    globals: false,
    environment: "node",
    include: [
      "test/unit/**/*.test.ts",
      "test/property/**/*.test.ts",
      "test/smoke/**/*.test.ts",
      "test/snapshots/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/cli/**"],
    },
    snapshotOptions: {
      snapshotsDirName: "__snapshots__",
    },
  },
});
