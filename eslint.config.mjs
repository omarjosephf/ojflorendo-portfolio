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
  {
    rules: {
      /**
       * `next/image` is not usable on this site.
       *
       * The Content-Security-Policy is nonce-based with no `'unsafe-inline'`
       * (see `src/proxy.ts`), and the optimiser's output is not compatible with
       * it. Weakening the CSP to satisfy an image loader would trade a real
       * security property for a convenience, so every image here is a plain
       * `<img>` pre-sized at build time — which is the work the optimiser would
       * otherwise be doing at runtime.
       *
       * The rule therefore only ever produces advice this project has already
       * considered and rejected. Left enabled it reports a permanent, growing
       * set of warnings that must each be individually ignored, which trains
       * everyone to skim past lint output — the real cost.
       *
       * Explicit dimensions on every `<img>` remain mandatory (CLAUDE.md §12):
       * that is what prevents layout shift, and it is enforced by review and by
       * the e2e checks, not by this rule.
       */
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
