// Local synthetic recovery qualification only. No connection string or live target.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

import { BACKUP_TABLES as TABLES } from "./management-backup.mjs";
export { TABLES };
const schemas = ["public", "auth", "ev_private", "budget_private"];
const roles = ["anon", "authenticated", "service_role"];
const destinations = new WeakMap();
const DAY = 86_400_000;
const LIMIT = 10 * 1024 * 1024;
export const digest = (value) => createHash("sha256").update(value).digest("hex");
const encode = (value) => JSON.stringify(value);

function exactKeys(value, keys) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), "Invalid object");
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), "Unexpected fields");
}
function parse(text) {
  assert.equal(typeof text, "string");
  assert.ok(Buffer.byteLength(text) <= LIMIT, "Recovery artifact too large");
  return JSON.parse(text);
}
function timestamp(value) {
  assert.equal(typeof value, "string");
  const result = Date.parse(value);
  assert.ok(Number.isFinite(result), "Invalid recovery timestamp");
  return result;
}
async function now(db) {
  return (await db.query("select clock_timestamp()::text as t")).rows[0].t;
}
async function schemaSources() {
  const root = new URL("../supabase/migrations/", import.meta.url);
  const files = (await readdir(root)).filter((f) => f.endsWith(".sql")).sort();
  const sources = await Promise.all(files.map(async (name) => ({ name, sql: (await readFile(new URL(name, root), "utf8")).replace(/\r\n/g, "\n") })));
  return { sources, sha256: digest(encode(sources)) };
}
export async function createSyntheticDatabase() {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("../supabase/tests/auth-fixture.sql", import.meta.url), "utf8"));
    for (const { sql } of (await schemaSources()).sources) await db.exec(sql);
    return db;
  } catch (error) { await db.close(); throw error; }
}
async function columns(db, table) {
  return (await db.query("select attname from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum", [table])).rows.map((r) => r.attname);
}
async function rows(db, table) {
  // Only names from the fixed code allowlist reach SQL identifiers.
  assert.ok(TABLES.includes(table));
  const result = (await db.query(`select to_jsonb(t) as row from ${table} t order by to_jsonb(t)::text limit 10001`)).rows.map((r) => r.row);
  assert.ok(result.length <= 10000, "Recovery row bound exceeded");
  return result;
}
export async function exportApplicationData(db, sourceId) {
  assert.match(sourceId, /^[a-z0-9-]{1,80}$/);
  await db.exec("begin isolation level repeatable read read only");
  try {
    const tables = {};
    const capturedAt = await now(db);
    for (const table of TABLES) tables[table] = await rows(db, table);
    const text = encode({ version: 1, sourceId, capturedAt, schemaSha256: (await schemaSources()).sha256, tables });
    assert.ok(Buffer.byteLength(text) <= LIMIT, "Recovery artifact too large");
    await db.exec("commit");
    return text;
  } catch (error) { await db.exec("rollback"); throw error; }
}
export async function exportCurrentDeletionLedger(db, sourceId) {
  assert.match(sourceId, /^[a-z0-9-]{1,80}$/);
  await db.exec("begin isolation level repeatable read read only");
  try {
    const result = encode({ version: 1, sourceId, capturedAt: await now(db), conversations: await rows(db, "ev_private.deleted_conversations") });
    await db.exec("commit");
    return result;
  } catch (error) { await db.exec("rollback"); throw error; }
}
async function securityFingerprint(db) {
  const result = {};
  const queries = {
    tables: "select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,pg_get_userbyid(c.relowner) as owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ev_private','budget_private') and c.relkind='r' order by 1,2",
    columns: "select n.nspname,c.relname,a.attname,a.attacl::text from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ev_private','budget_private') and a.attnum>0 and not a.attisdropped order by 1,2,3",
    policies: "select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','ev_private','budget_private') order by 1,2,3",
    functions: "select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args,pg_get_functiondef(p.oid) as definition,p.proacl::text,pg_get_userbyid(p.proowner) as owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth','ev_private','budget_private') and p.prokind='f' order by 1,2,3",
    roles: "select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls from pg_roles where rolname in ('anon','authenticated','service_role') order by 1",
    memberships: "select roleid::regrole::text,member::regrole::text,admin_option from pg_auth_members order by 1,2",
    constraints: "select conrelid::regclass::text as relation,conname,pg_get_constraintdef(oid) as definition,convalidated from pg_constraint where connamespace in ('public'::regnamespace,'ev_private'::regnamespace,'budget_private'::regnamespace) order by 1,2",
    triggers: "select tgrelid::regclass::text as relation,tgname,tgenabled,pg_get_triggerdef(oid) as definition from pg_trigger where tgrelid in (select oid from pg_class where relnamespace in ('public'::regnamespace,'ev_private'::regnamespace,'budget_private'::regnamespace)) order by 1,2",
  };
  for (const [key, sql] of Object.entries(queries)) result[key] = (await db.query(sql)).rows;
  return digest(encode(result));
}
async function quarantine(db) {
  await db.exec("reset role");
  for (const schema of schemas) await db.exec(`revoke all on schema ${schema} from public,anon,authenticated,service_role`);
}
export async function assertQuarantined(db) {
  for (const role of roles) for (const schema of schemas) {
    assert.equal((await db.query("select has_schema_privilege($1,$2,'USAGE') as allowed", [role, schema])).rows[0].allowed, false, "Recovery access must stay disabled");
  }
}
export async function createRestoreDestination() {
  const db = await createSyntheticDatabase();
  // Build a new recovery-specific read-only grant set from code, never backup ACLs.
  for (const schema of schemas) {
    await db.exec(`revoke all on all tables in schema ${schema} from public,anon,authenticated,service_role`);
    await db.exec(`revoke all on all functions in schema ${schema} from public,anon,authenticated,service_role`);
  }
  for (const table of TABLES) {
    const names = (await columns(db, table)).map((n) => `"${n}"`).join(",");
    await db.exec(`revoke select(${names}),insert(${names}),update(${names}),references(${names}) on ${table} from public,anon,authenticated,service_role`);
    if (table.startsWith("public.")) await db.exec(`grant select on ${table} to authenticated`);
  }
  await db.exec("grant execute on function auth.uid(),auth.jwt(),ev_private.active_session(),ev_private.is_owner() to authenticated");
  await quarantine(db);
  await assertQuarantined(db);
  destinations.set(db, { fingerprint: await securityFingerprint(db), restored: false, opened: false });
  return db;
}
async function insert(db, table, values) {
  assert.ok(TABLES.includes(table));
  if (values.length) await db.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table},$1::jsonb)`, [encode(values)]);
}
export async function restoreApplicationData(db, backupText, options) {
  const state = destinations.get(db);
  assert.ok(state && !state.restored && !state.opened, "Fresh isolated destination required");
  await db.exec("begin");
  try {
    await assertQuarantined(db);
    assert.equal(await securityFingerprint(db), state.fingerprint, "Recovery security drift");
    const backup = parse(backupText);
    assert.equal(digest(backupText), options.backupSha256, "Backup digest mismatch");
    exactKeys(backup, ["version", "sourceId", "capturedAt", "schemaSha256", "tables"]);
    assert.equal(backup.version, 1);
    assert.equal(backup.sourceId, options.sourceId, "Backup source mismatch");
    assert.equal(backup.schemaSha256, (await schemaSources()).sha256, "Backup schema mismatch");
    const recoveryTime = timestamp(await now(db)), backupTime = timestamp(backup.capturedAt);
    assert.ok(backupTime <= recoveryTime && recoveryTime - backupTime <= 7 * DAY, "Backup outside seven-day window");
    exactKeys(backup.tables, TABLES);
    for (const table of TABLES) {
      assert.ok(Array.isArray(backup.tables[table]) && backup.tables[table].length <= 10000);
      const fields = await columns(db, table);
      for (const row of backup.tables[table]) exactKeys(row, fields);
      assert.equal((await rows(db, table)).length, 0, "Destination must be empty");
    }
    assert.equal((await db.query("select count(*)::int as n from auth.sessions")).rows[0].n, 0, "Sessions prohibited during restore");
    assert.equal((await db.query("select count(*)::int as n from ev_private.owners")).rows[0].n, 0, "Owner assignments are independent of recovery");
    let ledger = null;
    if (options.currentLedgerText !== null) {
      ledger = parse(options.currentLedgerText);
      assert.equal(digest(options.currentLedgerText), options.currentLedgerSha256, "Current ledger digest mismatch");
      exactKeys(ledger, ["version", "sourceId", "capturedAt", "conversations"]);
      assert.equal(ledger.version, 1);
      assert.equal(ledger.sourceId, options.sourceId, "Ledger source mismatch");
      const ledgerTime = timestamp(ledger.capturedAt);
      assert.ok(ledgerTime >= backupTime && ledgerTime <= recoveryTime && recoveryTime - ledgerTime <= 5 * 60_000, "Ledger not current for cutover");
      assert.ok(Array.isArray(ledger.conversations) && ledger.conversations.length <= 10000);
      for (const row of ledger.conversations) {
        exactKeys(row, ["conversation_id", "deleted_at"]);
        assert.ok(timestamp(row.deleted_at) <= ledgerTime, "Deletion after ledger cutover");
      }
    } else {
      assert.equal(options.currentLedgerSha256, null, "Missing ledger must be explicit");
    }
    // The latest externally reviewed list binds exact draft bytes, not just IDs.
    const approved = options.approvedDrafts;
    assert.ok(Array.isArray(approved));
    for (const item of approved) exactKeys(item, ["id", "sha256"]);
    const selected = backup.tables["public.ev_knowledge_drafts"].filter((row) => approved.some((a) => a.id === row.id && a.sha256 === digest(encode(row))));
    assert.equal(selected.length, approved.length, "Approved draft absent or changed");
    await insert(db, "public.ev_knowledge_drafts", selected);
    const drafts = new Set(selected.map((r) => r.id));
    await insert(db, "ev_private.editorial_receipts", backup.tables["ev_private.editorial_receipts"].filter((r) => drafts.has(r.draft_id)));
    let reconciled = 0;
    if (ledger) {
      for (const table of TABLES.filter((t) => !["public.ev_knowledge_drafts", "ev_private.editorial_receipts", "public.ev_gap_reviews", "ev_private.deleted_conversations"].includes(t))) await insert(db, table, backup.tables[table]);
      for (const row of [...backup.tables["ev_private.deleted_conversations"], ...ledger.conversations]) {
        await db.query("insert into ev_private.deleted_conversations(conversation_id,deleted_at) values($1,$2) on conflict(conversation_id) do update set deleted_at=greatest(ev_private.deleted_conversations.deleted_at,excluded.deleted_at)", [row.conversation_id, row.deleted_at]);
      }
      reconciled = (await db.query("select ev_private.reconcile_restored_conversations() as n")).rows[0].n;
    }
    // Legacy gap deletion history is incomplete. No reviews are eligible for restore.
    assert.equal((await rows(db, "public.ev_gap_reviews")).length, 0);
    assert.equal((await db.query("select count(*)::int as n from public.ev_conversations c where expires_at<=clock_timestamp() or exists(select 1 from ev_private.deleted_conversations d where d.conversation_id=c.id)")).rows[0].n, 0);
    await assertQuarantined(db);
    assert.equal(await securityFingerprint(db), state.fingerprint, "Recovery security drift");
    const receipt = { mode: ledger ? "current-ledger" : "empty-chats", reconciledConversations: reconciled, discardedGapReviews: backup.tables["public.ev_gap_reviews"].length, restoredDrafts: selected.length, restoredConversations: (await rows(db, "public.ev_conversations")).length, authSessionsRestored: 0, budgetRowsRestored: 0, access: "disabled" };
    await db.exec("commit");
    state.restored = true;
    state.ledgerTime = ledger ? timestamp(ledger.capturedAt) : null;
    return receipt;
  } catch (error) { await db.exec("rollback"); await quarantine(db); throw error; }
}
export async function enableRecoveredReadAccess(db) {
  const state = destinations.get(db);
  assert.ok(state?.restored && !state.opened, "Completed isolated restore required");
  await db.exec("begin");
  try {
    await assertQuarantined(db);
    assert.equal(await securityFingerprint(db), state.fingerprint, "Recovery security drift");
    if (state.ledgerTime !== null) assert.ok(timestamp(await now(db)) - state.ledgerTime <= 5 * 60_000, "Ledger cutover approval expired");
    await db.exec("select ev_private.reconcile_restored_conversations()");
    await db.exec("grant usage on schema public,auth,ev_private to authenticated");
    await db.exec("commit");
    state.opened = true;
  } catch (error) { await db.exec("rollback"); await quarantine(db); throw error; }
}
