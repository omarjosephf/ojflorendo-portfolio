// Synthetic credentials and in-memory stores only. Never invokes the armed CLI.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { BACKUP_TABLES, openBackup } from "./management-backup.mjs";
import { runBackupJob, cleanBackupRetention, backupPrefix } from "./management-backup-job.mjs";
import { backupConfiguration, r2BackupStore } from "./run-management-backup.mjs";
import { exportManagedBackup, loadBackupContract } from "./management-backup-export.mjs";
import { createSyntheticDatabase } from "./management-restore.mjs";

const sourceId = "abcdefghijklmnopqrst";
const key = randomBytes(32);
const NOW = Date.parse("2026-09-09T20:00:00.000Z"), DAY = 86400000;
const prefix = backupPrefix(sourceId);
const uuid = "10000000-0000-4000-8000-000000000001";
const objectKey = (age, kind = "application") => `${prefix}${NOW - age}-${uuid}/${kind}.enc.json`;
const content = "Synthetic private visitor text";
const application = JSON.stringify({ version: 1, sourceId, capturedAt: new Date(NOW).toISOString(), schemaSha256: "a".repeat(64), tables: Object.fromEntries(BACKUP_TABLES.map((t) => [t, t === "public.ev_messages" ? [{ body: content }] : []])) });
const deletions = JSON.stringify({ version: 1, sourceId, capturedAt: new Date(NOW).toISOString(), conversations: [] });
const snapshot = { application, deletions };
let passed = 0;
async function check(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
function memoryStore() {
  const objects = new Map();
  const calls = { put: 0, get: 0, remove: 0, list: 0 };
  return { objects, calls,
    async list(p) { calls.list++; return { objects: [...objects.keys()].filter((k) => k.startsWith(p)).map((key) => ({ key })) }; },
    async put(k, data) { calls.put++; if (objects.has(k)) throw new Error("Precondition"); objects.set(k, data); },
    async get(k) { calls.get++; return objects.get(k) ?? null; },
    async remove(keys) { calls.remove++; for (const k of keys) objects.delete(k); },
  };
}
const run = (store, options = {}) => runBackupJob({ store, key, sourceId, capture: async () => snapshot, now: () => NOW, ...options });
const denied = async (fn, stage) => assert.rejects(fn, (error) => error.message === `Encrypted backup failed during ${stage}.` && !error.cause);
try {
  await check("encrypted upload is verified by readback with no plaintext or key in storage/report", async () => {
    const store = memoryStore(), report = await run(store);
    assert.equal(report.status, "verified"); assert.equal(report.objectsUploaded, 2);
    assert.equal(store.calls.get, 2); assert.equal(store.objects.size, 2);
    for (const [name, value] of store.objects) {
      assert.ok(!value.includes(content) && !value.includes(key.toString("base64")));
      const kind = name.endsWith("/application.enc.json") ? "application" : "deletions";
      assert.equal(openBackup(value, key, { kind, sourceId, now: NOW }), snapshot[kind]);
    }
    assert.ok(!JSON.stringify(report).includes(content));
  });
  await check("an accepted PUT with a lost acknowledgement is reconciled without a second PUT", async () => {
    const store = memoryStore(), put = store.put;
    store.put = async (...args) => { await put(...args); throw new Error(content); };
    await run(store); assert.equal(store.calls.put, 2);
  });
  await check("an absent upload retries once with identical bytes and key", async () => {
    const store = memoryStore(), put = store.put, calls = [];
    store.put = async (k, value) => { calls.push([k, value]); if (calls.length === 1) throw new Error(content); return put(k, value); };
    await run(store); assert.equal(calls.length, 3); assert.deepEqual(calls[0], calls[1]);
  });
  await check("exhausted uploads fail after two attempts", async () => {
    const store = memoryStore(); store.put = async () => { store.calls.put++; throw new Error(content); };
    await denied(() => run(store), "upload verification"); assert.equal(store.calls.put, 2);
  });
  await check("unknown readback and corrupted remote bytes cannot certify or overwrite a backup", async () => {
    for (const get of [async () => { throw new Error(content); }, async () => "corrupt"]) {
      const store = memoryStore(); store.get = get;
      await denied(() => run(store), "upload verification"); assert.equal(store.calls.put, 1);
    }
  });
  await check("retention deletes only recognized source objects at the six-day boundary", async () => {
    const store = memoryStore(), foreign = objectKey(7 * DAY).replace(sourceId, "z".repeat(20));
    store.objects.set(objectKey(6 * DAY), "old"); store.objects.set(objectKey(6 * DAY - 1), "recent"); store.objects.set(foreign, "unrelated");
    const report = await cleanBackupRetention(store, sourceId, NOW);
    assert.equal(report.removed, 1); assert.ok(store.objects.has(foreign)); assert.ok(store.objects.has(objectKey(6 * DAY - 1)));
    assert.equal(store.calls.list, 2);
  });
  await check("uncertain deletion succeeds only if the authoritative re-list proves removal", async () => {
    const store = memoryStore(), remove = store.remove; store.objects.set(objectKey(7 * DAY), "old");
    store.remove = async (keys) => { await remove(keys); throw new Error(content); };
    assert.equal((await cleanBackupRetention(store, sourceId, NOW)).removed, 1);
  });
  await check("failed remote cleanup fails before exporting current data", async () => {
    const store = memoryStore(); store.objects.set(objectKey(6 * DAY), "old"); store.remove = async () => {};
    let exported = false;
    await denied(() => run(store, { capture: async () => { exported = true; return snapshot; } }), "retention");
    assert.equal(exported, false); assert.equal(store.calls.put, 0);
  });
  await check("unavailable source does not prevent overdue cleanup", async () => {
    const store = memoryStore(); store.objects.set(objectKey(7 * DAY), "old");
    await denied(() => run(store, { capture: async () => { throw new Error(content); } }), "export"); assert.equal(store.objects.size, 0);
  });
  await check("unknown, future and out-of-prefix keys are not deleted", async () => {
    for (const k of [`${prefix}unknown`, objectKey(-1), "unrelated/key"]) {
      const store = memoryStore(); store.list = async () => ({ objects: [{ key: k }] });
      await denied(() => run(store), "retention"); assert.equal(store.calls.remove, 0); assert.equal(store.calls.put, 0);
    }
  });
  await check("repeated pagination tokens and duplicate objects fail closed", async () => {
    for (const page of [{ objects: [], nextToken: "repeated" }, { objects: [{ key: objectKey(DAY) }, { key: objectKey(DAY) }] }]) {
      const store = memoryStore(); store.list = async () => page;
      await denied(() => run(store), "retention"); assert.equal(store.calls.remove, 0);
    }
  });
  await check("stale, mismatched and unallowlisted captures never upload", async () => {
    for (const variant of [
      { ...snapshot, application: application.replace(new Date(NOW).toISOString(), new Date(NOW - 5 * 60000).toISOString()) },
      { ...snapshot, deletions: deletions.replace(new Date(NOW).toISOString(), new Date(NOW - 1).toISOString()) },
      { ...snapshot, application: application.replace("public.ev_messages", "auth.users") },
      { ...snapshot, deletions: deletions.replace('"conversations":[]', '"conversations":[],"extra":"unapproved"') },
      { ...snapshot, deletions: deletions.replace(sourceId, "z".repeat(20)) },
    ]) {
      const store = memoryStore(); await assert.rejects(() => run(store, { capture: async () => variant })); assert.equal(store.calls.put, 0);
    }
  });
  const env = { EV_BACKUP_ENABLED: "true", EV_BACKUP_SOURCE_ID: sourceId, EV_BACKUP_DATABASE_URL: `postgresql://ev_backup_reader:synthetic-password-only@db.${sourceId}.supabase.co:5432/postgres`, EV_BACKUP_R2_ACCOUNT_ID: "a".repeat(32), EV_BACKUP_R2_BUCKET: "ev-private-backups", EV_BACKUP_R2_ACCESS_KEY_ID: "SYNTHETICKEY".repeat(3), EV_BACKUP_R2_SECRET_ACCESS_KEY: "synthetic-secret-only".repeat(3), EV_BACKUP_KEY_BASE64: key.toString("base64") };
  await check("configuration binds source, EU bucket, verified TLS and a dedicated reader", async () => {
    const config = backupConfiguration(env);
    assert.equal(config.storage.endpoint, `https://${"a".repeat(32)}.eu.r2.cloudflarestorage.com`);
    assert.equal(config.database.ssl.rejectUnauthorized, true); assert.equal(config.storage.maxAttempts, 1); config.key.fill(0);
    const pool = backupConfiguration({ ...env, EV_BACKUP_DATABASE_URL: `postgresql://ev_backup_reader.${sourceId}:synthetic-password-only@aws-0-eu-west-1.pooler.supabase.com:5432/postgres` }); pool.key.fill(0);
    const emptyOptionalCA = backupConfiguration({ ...env, EV_BACKUP_DATABASE_CA_PEM: "" }); emptyOptionalCA.key.fill(0);
    for (const variant of [{ EV_BACKUP_ENABLED: "false" }, { EV_BACKUP_SOURCE_ID: "z".repeat(20) }, { EV_BACKUP_R2_BUCKET: "other-bucket" }, { EV_BACKUP_DATABASE_URL: env.EV_BACKUP_DATABASE_URL.replace("ev_backup_reader:", "postgres:") }, { EV_BACKUP_DATABASE_URL: env.EV_BACKUP_DATABASE_URL + "?sslmode=disable" }, { EV_BACKUP_DATABASE_URL: env.EV_BACKUP_DATABASE_URL.replace("supabase.co", "example.com") }, { EV_BACKUP_KEY_BASE64: "bad" }, { EV_BACKUP_DATABASE_URL: env.EV_BACKUP_DATABASE_URL.replace(":5432", ":6543") }]) assert.throws(() => backupConfiguration({ ...env, ...variant }));
  });
  await check("S3 adapter uses conditional Standard uploads and bounds response bodies", async () => {
    const commands = [], signal = new AbortController().signal;
    let response = {};
    const client = { async send(command, options) { commands.push(command); assert.ok(options.abortSignal); return response; } };
    const store = r2BackupStore(client, "ev-private-backups", signal);
    await store.put("synthetic-key", "encrypted");
    assert.equal(commands[0].input.IfNoneMatch, "*"); assert.equal(commands[0].input.StorageClass, "STANDARD"); assert.equal(commands[0].input.ContentLength, 9);
    response = { ContentLength: 9, Body: Readable.from([Buffer.from("encrypted")]) }; assert.equal(await store.get("synthetic-key"), "encrypted");
    response = { ContentLength: 2, Body: Readable.from([Buffer.from("too long")]) }; await assert.rejects(() => store.get("synthetic-key"));
    response = { ContentLength: 20000000, Body: Readable.from([]) }; await assert.rejects(() => store.get("synthetic-key"));
    response = { IsTruncated: true, Contents: [] }; await assert.rejects(() => store.list(prefix));
    response = { Errors: [{ Key: "synthetic", Code: "AccessDenied" }] }; await assert.rejects(() => store.remove(["synthetic"]));
  });

  const contract = await loadBackupContract(), db = await createSyntheticDatabase();
  try {
    // Synthetic stand-in for managed CLI history. Never apply this fixture live.
    await db.exec("create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key, statements text[])");
    for (const version of contract.versions) await db.query("insert into supabase_migrations.schema_migrations values($1,array['synthetic'])", [version]);
    const A = "80000000-0000-4000-8000-000000000001", B = "80000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users(id) values($1),($2)", [A, B]);
    await db.query("insert into public.ev_conversations(id,user_id,app) values($1,$1,'ev'),($2,$2,'ev')", [A, B]);
    await db.query("insert into ev_private.deleted_conversations values($1,now()-interval '1 day')", [uuid]);
    const setup = await readFile(new URL("../supabase/operations/prepare-backup-reader.sql", import.meta.url), "utf8");
    await check("reader setup requires exact migration history and refuses an existing role", async () => {
      await db.exec("begin; delete from supabase_migrations.schema_migrations where version='202609090008'");
      await assert.rejects(() => db.exec(setup)); await db.exec("rollback");
      await db.exec(setup);
      await assert.rejects(() => db.exec(setup)); await db.exec("rollback");
      const role = (await db.query("select rolcanlogin,rolsuper,rolinherit,rolbypassrls,rolcreaterole,rolcreatedb from pg_roles where rolname='ev_backup_reader'")).rows[0];
      assert.ok(Object.values(role).every((v) => v === false));
    });
    await check("dedicated reader exports all principals and private deletions under one read-only snapshot", async () => {
      await db.exec("set role ev_backup_reader");
      const result = await exportManagedBackup(db, sourceId, contract);
      assert.equal(JSON.parse(result.application).tables["public.ev_conversations"].length, 2);
      assert.equal(JSON.parse(result.deletions).conversations.length, 1);
      assert.equal(JSON.parse(result.application).capturedAt, JSON.parse(result.deletions).capturedAt);
      assert.ok(!result.application.includes("auth.users") && !result.application.includes("budget_private"));
    });
    await check("backup credential cannot read Auth, owner assignments, SQL history bodies or spending data", async () => {
      for (const table of ["auth.users", "auth.sessions", "ev_private.owners", "budget_private.pools", "budget_private.reservations"]) await assert.rejects(() => db.query(`select * from ${table}`), { code: "42501" });
      await assert.rejects(() => db.query("select statements from supabase_migrations.schema_migrations"), { code: "42501" });
      for (const table of BACKUP_TABLES) {
        await assert.rejects(() => db.query(`delete from ${table} where false`), { code: "42501" });
        assert.equal((await db.query("select has_table_privilege(current_user,$1,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') as allowed", [table])).rows[0].allowed, false);
      }
      assert.equal((await db.query("select pg_has_role(current_user,'service_role','MEMBER') as member")).rows[0].member, false);
    });
    await check("ordinary anonymous and signed-out authenticated roles do not inherit backup access", async () => {
      await db.exec("reset role; set role anon"); await assert.rejects(() => db.query("select * from ev_private.deleted_conversations"), { code: "42501" });
      await db.exec("reset role; set role authenticated");
      assert.equal((await db.query("select * from public.ev_conversations")).rows.length, 0);
      await assert.rejects(() => db.query("select * from ev_private.deleted_conversations"), { code: "42501" });
      await db.exec("reset role");
    });
    await check("export rejects elevated identities, schema drift, incomplete history and excess rows without raw errors", async () => {
      await assert.rejects(() => exportManagedBackup(db, sourceId, contract), /^Error: Backup export validation failed\.$/);
      await db.exec("alter table public.ev_conversations add column unexpected_secret text; set role ev_backup_reader");
      await assert.rejects(() => exportManagedBackup(db, sourceId, contract), /^Error: Backup export validation failed\.$/);
      await db.exec("reset role; alter table public.ev_conversations drop column unexpected_secret; delete from supabase_migrations.schema_migrations where version='202609090008'; set role ev_backup_reader");
      await assert.rejects(() => exportManagedBackup(db, sourceId, contract), /^Error: Backup export validation failed\.$/);
      await db.exec("reset role; insert into supabase_migrations.schema_migrations values('202609090008',null); insert into ev_private.deleted_conversations select md5(n::text)::uuid,now() from generate_series(1,10001) n; set role ev_backup_reader");
      await assert.rejects(() => exportManagedBackup(db, sourceId, contract), /^Error: Backup export validation failed\.$/);
      await db.exec("reset role");
    });
  } finally { await db.close(); }
  console.log(`Backup job qualification passed: ${passed} checks; no network or real credentials used.`);
} finally { key.fill(0); }
