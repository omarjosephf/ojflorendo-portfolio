#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const EXCEPTION_ID = "EXC-0001";
const ADVISORY_ID = "GHSA-mh99-v99m-4gvg";
const ADVISORY_URL = `https://github.com/advisories/${ADVISORY_ID}`;
const EXCEPTION_PATH =
  "docs/exceptions/EXC-0001-eslint-brace-expansion-dev-tooling.md";
const PACKAGE_LOCK_PATH = "package-lock.json";
const EXPIRES_AFTER_UTC = Date.parse("2026-08-13T00:00:00.000Z");

const EXPECTED_VULNERABILITY_NAMES = new Set([
  "@eslint/config-array",
  "@eslint/eslintrc",
  "brace-expansion",
  "eslint",
  "eslint-config-next",
  "eslint-plugin-import",
  "eslint-plugin-jsx-a11y",
  "eslint-plugin-react",
  "minimatch",
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

function validateExceptionRecord(text, now = Date.now()) {
  assert(text.includes(`- **Status:** Active`), `${EXCEPTION_ID} is not active.`);
  assert(
    text.includes(`- **Expiry:** 2026-08-12 (inclusive)`),
    `${EXCEPTION_ID} expiry does not match the approved date.`,
  );
  assert(text.includes(ADVISORY_ID), `${EXCEPTION_ID} advisory ID is missing.`);
  assert(
    text.includes("`brace-expansion@1.1.16`"),
    `${EXCEPTION_ID} package version is missing.`,
  );
  assert(
    text.includes("`minimatch@3.1.5`"),
    `${EXCEPTION_ID} dependency path is missing.`,
  );
  assert(
    now < EXPIRES_AFTER_UTC,
    `${EXCEPTION_ID} expired after 2026-08-12 UTC.`,
  );
}

function validatePackageLock(lock) {
  const packages = lock?.packages;
  assert(packages && typeof packages === "object", "Invalid package-lock.json.");

  assert(
    packages["node_modules/brace-expansion"]?.version === "1.1.16",
    "Expected legacy brace-expansion@1.1.16 was not found at the approved path.",
  );
  assert(
    packages["node_modules/minimatch"]?.version === "3.1.5",
    "Expected minimatch@3.1.5 was not found at the approved path.",
  );
  assert(
    packages[
      "node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion"
    ]?.version === "5.0.8",
    "The compatible nested brace-expansion path is not patched to 5.0.8.",
  );

  const braceVersions = new Set(
    Object.entries(packages)
      .filter(([path, value]) => {
        return (
          path.endsWith("/node_modules/brace-expansion") ||
          path === "node_modules/brace-expansion"
        ) && value?.version;
      })
      .map(([, value]) => value.version),
  );

  const unexpected = [...braceVersions].filter(
    (version) => version !== "1.1.16" && version !== "5.0.8",
  );
  assert(
    unexpected.length === 0,
    `Unexpected brace-expansion version(s): ${unexpected.join(", ")}`,
  );
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

function validateProductionAudit(report, exitCode) {
  const vulnerabilityCounts = counts(report);
  const vulnerabilities = report?.vulnerabilities ?? {};

  assert(exitCode === 0, "Production-only npm audit did not exit successfully.");
  assert(
    Object.keys(vulnerabilities).length === 0,
    "Production-only audit contains vulnerability entries.",
  );
  assert(
    Object.values(vulnerabilityCounts).every((value) => value === 0),
    `Production-only audit is not clean: ${JSON.stringify(vulnerabilityCounts)}`,
  );
}

function collectAdvisoryObjects(vulnerabilities) {
  const objects = [];
  for (const vulnerability of Object.values(vulnerabilities)) {
    for (const via of vulnerability?.via ?? []) {
      if (via && typeof via === "object") objects.push(via);
    }
  }
  return objects;
}

function validateFullAudit(report, exitCode) {
  const vulnerabilities = report?.vulnerabilities;
  assert(
    vulnerabilities && typeof vulnerabilities === "object",
    "Full audit vulnerability data is missing.",
  );

  const names = new Set(Object.keys(vulnerabilities));
  const missing = [...EXPECTED_VULNERABILITY_NAMES].filter(
    (name) => !names.has(name),
  );
  const extra = [...names].filter(
    (name) => !EXPECTED_VULNERABILITY_NAMES.has(name),
  );

  assert(missing.length === 0, `Expected audit entries missing: ${missing.join(", ")}`);
  assert(extra.length === 0, `Unexpected audit entries found: ${extra.join(", ")}`);
  assert(exitCode === 1, "Full audit unexpectedly exited successfully.");

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    assert(
      vulnerability.severity === "high",
      `${name} has unexpected severity '${vulnerability.severity}'.`,
    );

    for (const via of vulnerability.via ?? []) {
      if (typeof via === "string") {
        assert(
          EXPECTED_VULNERABILITY_NAMES.has(via),
          `${name} references unexpected audit dependency '${via}'.`,
        );
      }
    }
  }

  const advisoryObjects = collectAdvisoryObjects(vulnerabilities);
  assert(
    advisoryObjects.length === 1,
    `Expected exactly one root advisory, found ${advisoryObjects.length}.`,
  );

  const advisory = advisoryObjects[0];
  assert(advisory.name === "brace-expansion", "Unexpected advisory package.");
  assert(advisory.severity === "high", "Unexpected advisory severity.");
  assert(advisory.url === ADVISORY_URL, "Unexpected advisory URL.");
  assert(advisory.range === "<=5.0.7", "Unexpected advisory affected range.");

  const vulnerabilityCounts = counts(report);
  assert(
    vulnerabilityCounts.info === 0 &&
      vulnerabilityCounts.low === 0 &&
      vulnerabilityCounts.moderate === 0 &&
      vulnerabilityCounts.high === 9 &&
      vulnerabilityCounts.critical === 0 &&
      vulnerabilityCounts.total === 9,
    `Full audit counts do not match ${EXCEPTION_ID}: ${JSON.stringify(
      vulnerabilityCounts,
    )}`,
  );
}

function approvedFixture() {
  const vulnerabilities = {};
  for (const name of EXPECTED_VULNERABILITY_NAMES) {
    vulnerabilities[name] = {
      name,
      severity: "high",
      via: name === "brace-expansion" ? [
        {
          source: 123456,
          name: "brace-expansion",
          dependency: "brace-expansion",
          title: "DoS via unbounded expansion length",
          url: ADVISORY_URL,
          severity: "high",
          range: "<=5.0.7",
        },
      ] : ["brace-expansion"],
      effects: [],
      range: "*",
      nodes: [`node_modules/${name}`],
      fixAvailable: false,
    };
  }

  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 9,
        critical: 0,
        total: 9,
      },
    },
  };
}

function runSelfTest() {
  const exceptionText = [
    "- **Status:** Active",
    "- **Expiry:** 2026-08-12 (inclusive)",
    ADVISORY_ID,
    "`brace-expansion@1.1.16`",
    "`minimatch@3.1.5`",
  ].join("\n");

  validateExceptionRecord(exceptionText, Date.parse("2026-07-29T00:00:00Z"));
  validateProductionAudit(
    {
      vulnerabilities: {},
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
          total: 0,
        },
      },
    },
    0,
  );
  validateFullAudit(approvedFixture(), 1);

  let rejectedExtra = false;
  try {
    const fixture = approvedFixture();
    fixture.vulnerabilities["unexpected-package"] = {
      severity: "critical",
      via: [],
    };
    validateFullAudit(fixture, 1);
  } catch {
    rejectedExtra = true;
  }
  assert(rejectedExtra, "Self-test failed to reject an unexpected advisory.");

  let rejectedExpiry = false;
  try {
    validateExceptionRecord(exceptionText, EXPIRES_AFTER_UTC);
  } catch {
    rejectedExpiry = true;
  }
  assert(rejectedExpiry, "Self-test failed to reject an expired exception.");

  console.log("EXC-0001 dependency-audit validator self-test passed.");
}

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const exceptionText = readFileSync(EXCEPTION_PATH, "utf8");
  const packageLock = JSON.parse(readFileSync(PACKAGE_LOCK_PATH, "utf8"));

  validateExceptionRecord(exceptionText);
  validatePackageLock(packageLock);

  const production = runNpmAudit([
    "audit",
    "--omit=dev",
    "--audit-level=moderate",
    "--json",
  ]);
  validateProductionAudit(production.report, production.exitCode);
  console.log("Production dependency audit passed with 0 vulnerabilities.");

  const full = runNpmAudit(["audit", "--audit-level=moderate", "--json"]);
  validateFullAudit(full.report, full.exitCode);

  console.log(
    `Full dependency audit contains only the active ${EXCEPTION_ID} scope (${ADVISORY_ID}).`,
  );
  console.log("Dependency audit gate passed with the approved temporary exception.");
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
