#!/usr/bin/env node
/**
 * Reviewed-migration manifest consistency check.
 *
 * The reviewed migration version list is written down in three places that must
 * agree, and nothing kept them in step:
 *
 *   1. the filenames in supabase/migrations/
 *   2. `versions` and `schemaSha256` in supabase/operations/ev-backup-contract.json
 *   3. the hardcoded array in supabase/operations/prepare-backup-reader.sql
 *
 * Adding migration 202609110001 on 11 September 2026 desynchronised all three in
 * turn, and (3) was found only when the backup job aborted with "Reviewed
 * migration history required" — which in production is a backup that stops
 * running rather than a build that fails. The exporter already re-checks (1) and
 * (2) at run time; this check moves all three into CI, where a missing update
 * costs a red build instead of a silent gap in recovery coverage.
 *
 * Exits 0 when all three agree, 1 otherwise.
 */
import { readFile } from "node:fs/promises";
import { backupSchemaSources, schemaDigest } from "./management-backup-export.mjs";

const CONTRACT = "supabase/operations/ev-backup-contract.json";
const READER = "supabase/operations/prepare-backup-reader.sql";

const problems = [];
const sources = await backupSchemaSources();
const fromFilenames = sources.map(({ name }) => name.split("_")[0]);

const contract = JSON.parse(await readFile(new URL(`../${CONTRACT}`, import.meta.url), "utf8"));
if (JSON.stringify(contract.versions) !== JSON.stringify(fromFilenames)) {
  problems.push(
    `${CONTRACT} "versions" does not match the migration filenames.\n` +
      `    files:    ${fromFilenames.join(", ")}\n` +
      `    contract: ${(contract.versions ?? []).join(", ")}`,
  );
}

const expectedDigest = schemaDigest(sources);
if (contract.schemaSha256 !== expectedDigest) {
  problems.push(
    `${CONTRACT} "schemaSha256" is stale for the current migration source.\n` +
      `    expected: ${expectedDigest}\n` +
      `    found:    ${contract.schemaSha256}`,
  );
}

const readerSql = await readFile(new URL(`../${READER}`, import.meta.url), "utf8");
const arrayMatch = readerSql.match(/array\[([^\]]*)\]::text\[\]/);
if (!arrayMatch) {
  problems.push(`${READER} no longer contains a recognisable array[...]::text[] migration list.`);
} else {
  const fromReader = [...arrayMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (JSON.stringify(fromReader) !== JSON.stringify(fromFilenames)) {
    problems.push(
      `${READER} migration array does not match the migration filenames.\n` +
        `    files:  ${fromFilenames.join(", ")}\n` +
        `    reader: ${fromReader.join(", ")}`,
    );
  }
}

if (problems.length > 0) {
  console.error("Reviewed-migration manifest is inconsistent.\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    "\nEvery reviewed migration must appear in all three places. Regenerate the" +
      "\ncontract digest with the repository's own schemaDigest rather than by hand.",
  );
  process.exit(1);
}

console.log(`Migration manifest check passed: ${fromFilenames.length} reviewed versions agree across filenames, contract and reader setup.`);
