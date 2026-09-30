#!/usr/bin/env node
/**
 * Launcher for the Phase 18.4 blog agents (ADR-0026). The owner runs it on
 * their own machine; it is not part of the site, the build or CI.
 *
 *   node --env-file=<path-to-key-file> scripts/blog-agents.mjs ideas
 *
 * The key file sits outside the repository and holds BLOG_GEMINI_API_KEY.
 * BLOG_AGENTS_DATA_DIR (absolute, outside the repository) receives private
 * run records and the spend ledger. This launcher transpiles src/lib/blog with
 * the repository's pinned TypeScript into a temporary folder and runs it; it
 * adds no dependency and never prints the key.
 */
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

const sourceRoot = join(repoRoot, "src", "lib", "blog");
const buildRoot = mkdtempSync(join(tmpdir(), "blog-agents-"));

function transpileTree(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__fixtures__" || entry === "bakeoff") continue;
      transpileTree(full);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts") && !entry.endsWith(".d.ts")) {
      const output = ts.transpileModule(readFileSync(full, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          verbatimModuleSyntax: false,
        },
        fileName: full,
      }).outputText;
      const target = join(buildRoot, relative(sourceRoot, full)).replace(/\.ts$/u, ".js");
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, output);
    }
  }
}

let exitCode = 1;
try {
  transpileTree(sourceRoot);
  const { main } = require(join(buildRoot, "live", "cli.js"));
  exitCode = await main(process.argv.slice(2), process.env, repoRoot);
} catch (error) {
  process.stderr.write(`blog-agents stopped: ${error instanceof Error ? error.message : String(error)}\n`);
  exitCode = 1;
} finally {
  rmSync(buildRoot, { recursive: true, force: true });
}
process.exit(exitCode);
