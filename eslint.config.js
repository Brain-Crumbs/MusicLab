import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        // Use a lint-only project that also includes test/ and examples/, which
        // the build tsconfig deliberately excludes. Without this, type-aware
        // linting fails to find test files in any project.
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": "warn",
    },
  },
  {
    // Tests favour terse fixtures and known-good indexing (e.g. `steps[0]!`).
    // Non-null assertions are idiomatic and safe here, so relax that rule for
    // test files only — production code under src/ still forbids them.
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
