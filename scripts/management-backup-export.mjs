// Server/operator tooling only. The database adapter owns TLS and credentials.
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { BACKUP_TABLES, BACKUP_MAX_BYTES } from "./management-backup.mjs";

const encode = JSON.stringify;
const requireValue = (value) => { if (!value) throw new Error("Backup export validation failed."); };
export const schemaDigest = (sources) => createHash("sha256").update(encode(sources)).digest("hex");
export async function backupSchemaSources() {
  const root = new URL("../supabase/migrations/", import.meta.url);
  return Promise.all((await readdir(root)).filter((f) => f.endsWith(".sql")).sort()
    .map(async (name) => ({ name, sql: (await readFile(new URL(name, root), "utf8")).replace(/\r\n/g, "\n") })));
}
export async function loadBackupContract() {
  const contract = JSON.parse(await readFile(new URL("../supabase/operations/ev-backup-contract.json", import.meta.url), "utf8"));
  const sources = await backupSchemaSources();
  requireValue(contract.schemaSha256 === schemaDigest(sources));
  requireValue(encode(contract.versions) === encode(sources.map(({ name }) => name.split("_")[0])));
  requireValue(encode(Object.keys(contract.tables).sort()) === encode([...BACKUP_TABLES].sort()));
  return contract;
}

/** One consistent snapshot. Exact reviewed columns, bounded rows/bytes; no Auth,
 * owner assignments, schema DDL, provider keys or spending ledger is exported. */
export async function exportManagedBackup(db, sourceId, contract) {
  requireValue(/^[a-z]{20}$/.test(sourceId));
  await db.query("begin isolation level repeatable read read only");
  try {
    await db.query("set local statement_timeout='15s'");
    await db.query("set local idle_in_transaction_session_timeout='20s'");
    const { rows: [identity] } = await db.query("select current_user as role, current_setting('transaction_read_only') as read_only, clock_timestamp()::text as captured_at");
    requireValue(identity.role === "ev_backup_reader" && identity.read_only === "on");
    const versions = (await db.query("select version from supabase_migrations.schema_migrations order by version limit 101")).rows.map((r) => r.version);
    requireValue(encode(versions) === encode(contract.versions));
    const capturedAt = new Date(identity.captured_at).toISOString();
    const tables = {};
    let bytes = 0;
    for (const table of BACKUP_TABLES) {
      const columns = contract.tables[table];
      requireValue(Array.isArray(columns) && columns.length > 0 && columns.every(({ name, type }) => /^[a-z_][a-z0-9_]*$/.test(name) && typeof type === "string"));
      const actual = (await db.query("select attname as name,format_type(atttypid,atttypmod) as type from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum", [table])).rows;
      requireValue(encode(actual) === encode(columns));
      const fields = columns.map(({ name }) => `"${name}"`).join(",");
      // Identifiers come only from the code allowlist and checked contract.
      const sql = `select case when octet_length(data::text)<=$1 then data::text else null end as data from (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) as data from (select ${fields} from ${table} limit 10001) t) bounded`;
      const { rows: [row] } = await db.query(sql, [BACKUP_MAX_BYTES - bytes]);
      requireValue(typeof row.data === "string");
      bytes += Buffer.byteLength(row.data);
      tables[table] = JSON.parse(row.data);
      requireValue(tables[table].length <= 10000);
    }
    const application = encode({ version: 1, sourceId, capturedAt, schemaSha256: contract.schemaSha256, tables });
    const deletions = encode({ version: 1, sourceId, capturedAt, conversations: tables["ev_private.deleted_conversations"] });
    requireValue(Buffer.byteLength(application) <= BACKUP_MAX_BYTES && Buffer.byteLength(deletions) <= BACKUP_MAX_BYTES);
    await db.query("commit");
    return { application, deletions };
  } catch {
    await db.query("rollback").catch(() => {});
    throw new Error("Backup export validation failed.");
  }
}
