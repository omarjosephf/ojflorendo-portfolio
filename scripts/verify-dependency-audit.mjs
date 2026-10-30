#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * Dependency audit gate.
 *
 * The production-only audit must be completely clean. The full audit must be
 * clean too, except for the one advisory covered by the active, time-limited
 * EXC-0002 (docs/exceptions/EXC-0002-eslint-braces-dev-tooling.md): the
 * unpatched `braces` advisory on the development-only ESLint path. That
 * allowance is exact (packages, source advisory, lockfile versions, no critical
 * finding) and stops on its expiry date. EXC-0001 was closed on 2026-08-01.
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

/**
 * EXC-0002, approved by the owner on 2026-10-13. The only full-audit entries it
 * allows are the five npm reports for the single path
 * eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces,
 * all tracing to GHSA-vfj7-8cjw-p6xm. Remove this block when EXC-0002 closes.
 */
const EXC_0002 = Object.freeze({
  id: "EXC-0002",
  expires: "2026-11-12",
  advisoryUrl: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
  sourcePackage: "braces",
  allowedBracesVersions: ["3.0.3"],
  chain: new Map([
    ["braces", null],
    ["micromatch", "braces"],
    ["fast-glob", "micromatch"],
    ["@next/eslint-plugin-next", "fast-glob"],
    ["eslint-config-next", "@next/eslint-plugin-next"],
  ]),
});

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

function utcDate(now) {
  return now.toISOString().slice(0, 10);
}

/** Every `braces` in the lockfile must be an allowed version and development-only. */
function validateExc0002Lock(lock) {
  const found = Object.entries(lock?.packages ?? {}).filter(
    ([path, value]) =>
      (path === "node_modules/braces" || path.endsWith("/node_modules/braces")) && value?.version,
  );
  assert(found.length > 0, "EXC-0002: no braces entry found in package-lock.json.");
  for (const [path, value] of found) {
    assert(
      EXC_0002.allowedBracesVersions.includes(value.version),
      `EXC-0002 covers braces ${EXC_0002.allowedBracesVersions.join(", ")} only; found ${value.version} at ${path}.`,
    );
    assert(value.dev === true, `EXC-0002 covers development-only braces; ${path} is not marked dev.`);
  }
}

/**
 * Accepts a dirty full audit only when every entry is exactly the EXC-0002 path,
 * the only source advisory is GHSA-vfj7-8cjw-p6xm, nothing is critical and the
 * exception has not expired.
 */
function validateFullAuditUnderExc0002(report, lock, now) {
  assert(
    utcDate(now) <= EXC_0002.expires,
    `EXC-0002 expired on ${EXC_0002.expires}; an expired exception has no authority.`,
  );
  const vulnerabilities = report?.vulnerabilities ?? {};
  const vulnerabilityCounts = counts(report);
  const names = Object.keys(vulnerabilities);
  assert(vulnerabilityCounts.critical === 0, "EXC-0002 never covers a critical finding.");
  assert(names.length > 0, "EXC-0002: a failing full audit reported no entries.");
  assert(
    vulnerabilityCounts.total === names.length,
    `EXC-0002: audit counts ${JSON.stringify(vulnerabilityCounts)} do not match its ${names.length} entries.`,
  );
  for (const name of names) {
    assert(EXC_0002.chain.has(name), `Full audit entry ${name} is outside EXC-0002.`);
    const via = vulnerabilities[name]?.via;
    assert(Array.isArray(via) && via.length > 0, `Full audit entry ${name} has no source.`);
    if (name === EXC_0002.sourcePackage) {
      for (const source of via) {
        assert(
          typeof source === "object" && source?.url === EXC_0002.advisoryUrl && source?.severity !== "critical",
          `braces carries an advisory outside EXC-0002: ${typeof source === "object" ? source?.url : source}.`,
        );
      }
    } else {
      assert(
        via.length === 1 && via[0] === EXC_0002.chain.get(name),
        `Full audit entry ${name} does not follow the EXC-0002 path: ${JSON.stringify(via)}.`,
      );
    }
  }
  validateExc0002Lock(lock);
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

  // EXC-0002 accepts exactly its own path and nothing else.
  const lock = { packages: { "node_modules/braces": { version: "3.0.3", dev: true } } };
  const scoped = () => ({
    vulnerabilities: {
      braces: { via: [{ url: EXC_0002.advisoryUrl, severity: "high" }] },
      micromatch: { via: ["braces"] },
      "fast-glob": { via: ["micromatch"] },
      "@next/eslint-plugin-next": { via: ["fast-glob"] },
      "eslint-config-next": { via: ["@next/eslint-plugin-next"] },
    },
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 5, critical: 0, total: 5 } },
  });
  const beforeExpiry = new Date("2026-11-12T23:59:59Z");
  validateFullAuditUnderExc0002(scoped(), lock, beforeExpiry);

  const withExtraPackage = scoped();
  withExtraPackage.vulnerabilities.next = { via: ["braces"] };
  withExtraPackage.metadata.vulnerabilities.high = 6;
  withExtraPackage.metadata.vulnerabilities.total = 6;
  const withSecondAdvisory = scoped();
  withSecondAdvisory.vulnerabilities.braces.via.push({
    url: "https://github.com/advisories/GHSA-0000-0000-0000",
    severity: "high",
  });
  const withCritical = scoped();
  withCritical.metadata.vulnerabilities.critical = 1;
  const mustReject = [
    ["after expiry", scoped(), lock, new Date("2026-11-13T00:00:00Z")],
    ["an extra package", withExtraPackage, lock, beforeExpiry],
    ["a second braces advisory", withSecondAdvisory, lock, beforeExpiry],
    ["a critical finding", withCritical, lock, beforeExpiry],
    ["another braces version", scoped(), { packages: { "node_modules/braces": { version: "3.0.2", dev: true } } }, beforeExpiry],
    ["a production braces", scoped(), { packages: { "node_modules/braces": { version: "3.0.3" } } }, beforeExpiry],
  ];
  for (const [label, report, lockfile, when] of mustReject) {
    let refused = false;
    try {
      validateFullAuditUnderExc0002(report, lockfile, when);
    } catch {
      refused = true;
    }
    assert(refused, `Self-test: EXC-0002 failed to reject ${label}.`);
  }

  console.log("Dependency audit gate self-test passed.");
}

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const lock = JSON.parse(readFileSync(PACKAGE_LOCK_PATH, "utf8"));
  validatePackageLock(lock);

  const production = runNpmAudit([
    "audit",
    "--omit=dev",
    "--audit-level=moderate",
    "--json",
  ]);
  validateCleanAudit(production.report, production.exitCode, "Production-only");
  console.log("Production dependency audit passed with 0 vulnerabilities.");

  const full = runNpmAudit(["audit", "--audit-level=moderate", "--json"]);
  if (full.exitCode === 0 && counts(full.report).total === 0) {
    validateCleanAudit(full.report, full.exitCode, "Full");
    console.log("Full dependency audit passed with 0 vulnerabilities.");
    console.log("EXC-0002 is no longer needed: close it and remove its allowance from this script.");
    return;
  }
  validateFullAuditUnderExc0002(full.report, lock, new Date());
  console.log(
    `Full dependency audit passed under ${EXC_0002.id} (GHSA-vfj7-8cjw-p6xm, development-only ESLint path; expires ${EXC_0002.expires}).`,
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
