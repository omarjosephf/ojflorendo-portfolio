import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output. Both are git-ignored but were still being linted, and
    // the HTML reporter emits a large minified bundle. `npm run test:ci` runs
    // lint before e2e, so a first run is clean and every subsequent local run
    // failed lint with thousands of errors from generated code. CI never saw
    // this because its workspace starts empty.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
