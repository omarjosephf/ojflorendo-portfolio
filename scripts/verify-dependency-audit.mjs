#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * Dependency audit gate.
 *
 * Both the production-only and the full audit must be completely clean. There is
 * no active dependency exception: EXC-0001 was closed on 2026-08-01 once
 * GHSA-mh99-v99m-4gvg was backported to the 1.x line and `brace-expansion` moved
 * to a patched version on every path.
 *
 * This script deliberately does NOT hardcode a list of expected advisories. The
 * previous version asserted an exact set of nine audit entries, and when the
 * advisory was re-scoped upstream that list stopped matching and the gate failed
 * on `main` for reasons unrelated to any change in this repository. Asserting
 * "clean" is both simpler and more durable than asserting "exactly these known
 * problems".
 *
 * The one specific guard retained is a regression check that no `brace-expansion`
 * instance slips back below its patched version, since that advisory previously
 * required an exception and a false fix attempt.
 */

const PACKAGE_LOCK_PATH = "package-lock.json";

/**
 * First patched version per major line for GHSA-mh99-v99m-4gvg. Any
 * `brace-expansion` in the tree must be at or above the entry for its major.
 */
const BRACE_EXPANSION_MINIMUMS = new Map([
  [1, "1.1.17"],
  [2, "2.1.3"],
  [3, "3.0.3"],
  [4, "5.0.8"],
  [5, "5.0.8"],
]);

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runNpmAudit(args) {
  const command =
    process.platform === "win32"
      ? (process.env.ComSpec ?? "cmd.exe")
      : npmCommand();
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm.cmd ${args.join(" ")}`]
      : args;

  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) {
    fail(`Could not start npm audit: ${result.error.message}`);
  }

  if (![0, 1].includes(result.status)) {
    fail(
      `npm audit exited unexpectedly with ${result.status}.\n${result.stderr}`,
    );
  }

  const stdout = result.stdout.trim();
  if (!stdout) {
    fail(`npm audit returned no JSON output.\n${result.stderr}`);
  }

  try {
    return {
      report: JSON.parse(stdout),
      exitCode: result.status,
    };
  } catch (error) {
    fail(
      `npm audit returned invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }\n${stdout.slice(0, 1000)}`,
    );
  }
}

/** Compare dotted numeric versions. Returns true when `version` >= `minimum`. */
function isAtLeast(version, minimum) {
  const a = String(version).split(".").map(Number);
  const b = String(minimum).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left > right;
  }
  return true;
}

function validatePackageLock(lock) {
  const packages = lock?.packages;
  assert(packages && typeof packages === "object", "Invalid package-lock.json.");

  const found = Object.entries(packages).filter(
    ([path, value]) =>
      (path === "node_modules/brace-expansion" ||
        path.endsWith("/node_modules/brace-expansion")) &&
      value?.version,
  );

  assert(
    found.length > 0,
    "No brace-expansion entry found in package-lock.json; the regression guard cannot run.",
  );

  for (const [path, value] of found) {
    const major = Number(String(value.version).split(".")[0]);
    const minimum = BRACE_EXPANSION_MINIMUMS.get(major);
    assert(
      minimum !== undefined,
      `brace-expansion@${value.version} at ${path} has an unrecognised major; add its patched minimum to BRACE_EXPANSION_MINIMUMS.`,
    );
    assert(
      isAtLeast(value.version, minimum),
      `brace-expansion@${value.version} at ${path} is below the patched minimum ${minimum} for GHSA-mh99-v99m-4gvg.`,
    );
  }
}

function counts(report) {
  const values = report?.metadata?.vulnerabilities;
  assert(values && typeof values === "object", "Audit metadata is missing.");
  return {
    info: Number(values.info ?? 0),
    low: Number(values.low ?? 0),
    moderate: Number(values.moderate ?? 0),
    high: Number(values.high ?? 0),
    critical: Number(values.critical ?? 0),
    total: Number(values.total ?? 0),
  };
}

function validateCleanAudit(report, exitCode, label) {
  const vulnerabilityCounts = counts(report);
  const vulnerabilities = report?.vulnerabilities ?? {};

  assert(exitCode === 0, `${label} npm audit did not exit successfully.`);
  assert(
    Object.keys(vulnerabilities).length === 0,
    `${label} audit contains vulnerability entries: ${Object.keys(vulnerabilities).join(", ")}`,
  );
  assert(
    Object.values(vulnerabilityCounts).every((value) => value === 0),
    `${label} audit is not clean: ${JSON.stringify(vulnerabilityCounts)}`,
  );
}

function runSelfTest() {
  // A clean report passes.
  validateCleanAudit(
    { vulnerabilities: {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } },
    0,
    "Self-test",
  );

  // A dirty report must be rejected.
  let rejected = false;
  try {
    validateCleanAudit(
      {
        vulnerabilities: { "brace-expansion": { severity: "high" } },
        metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1 } },
      },
      1,
      "Self-test",
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "Self-test failed to reject a dirty audit report.");

  // The regression guard must reject a vulnerable version and accept a patched one.
  let guardRejected = false;
  try {
    validatePackageLock({
      packages: { "node_modules/brace-expansion": { version: "1.1.16" } },
    });
  } catch {
    guardRejected = true;
  }
  assert(guardRejected, "Self-test failed to reject vulnerable brace-expansion@1.1.16.");

  validatePackageLock({
    packages: {
      "node_modules/brace-expansion": { version: "1.1.18" },
      "node_modules/x/node_modules/brace-expansion": { version: "5.0.9" },
    },
  });

  console.log("Dependency audit gate self-test passed.");
}

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  validatePackageLock(JSON.parse(readFileSync(PACKAGE_LOCK_PATH, "utf8")));

  const production = runNpmAudit([
    "audit",
    "--omit=dev",
    "--audit-level=moderate",
    "--json",
  ]);
  validateCleanAudit(production.report, production.exitCode, "Production-only");
  console.log("Production dependency audit passed with 0 vulnerabilities.");

  const full = runNpmAudit(["audit", "--audit-level=moderate", "--json"]);
  validateCleanAudit(full.report, full.exitCode, "Full");
  console.log("Full dependency audit passed with 0 vulnerabilities.");
  console.log(
    "Dependency audit gate passed with no active exception (EXC-0001 closed 2026-08-01).",
  );
}

try {
  main();
} catch (error) {
  console.error(
    `Dependency audit gate failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
}
