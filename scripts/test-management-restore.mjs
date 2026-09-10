import { randomBytes } from "node:crypto";
import { sealBackup, openBackup } from "./management-backup.mjs";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { TABLES, digest, createSyntheticDatabase, createRestoreDestination, exportApplicationData, exportCurrentDeletionLedger, restoreApplicationData, enableRecoveredReadAccess, assertQuarantined } from "./management-restore.mjs";

const id = (n) => `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1), B = id(2), OWNER = id(3), DRAFT = id(4);
const KEEP = id(10), DELETED = id(11), EXPIRED = id(12), OTHER = id(13);
const sha = "a".repeat(64), sourceId = "synthetic-restore-qualification";
let passed = 0;
const checks = [], databases = [];
const start = performance.now();
async function check(name, fn) {
  try { await fn(); passed++; checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, passed: false }); throw error; }
}
async function count(db, table) { return (await db.query(`select count(*)::int as n from ${table}`)).rows[0].n; }
async function identity(db, role, user, aal = "aal1", sessionId = user) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(user ? { sub: user, session_id: sessionId, aal, is_anonymous: user !== OWNER } : {})]);
  assert.ok(["postgres", "anon", "authenticated", "service_role"].includes(role));
  if (role !== "postgres") await db.exec(`set role ${role}`);
}
async function denied(db, sql, params = []) { await assert.rejects(() => db.query(sql, params), { code: "42501" }); }
async function destination(withPrincipals = true) {
  const db = await createRestoreDestination(); databases.push(db);
  if (withPrincipals) await db.query("insert into auth.users(id,is_anonymous) values($1,true),($2,true),($3,false)", [A, B, OWNER]);
  return db;
}
let backupText, ledgerText, options;
async function rejection(name, modify, pattern) {
  await check(name, async () => {
    const db = await destination();
    const backup = JSON.parse(backupText), ledger = JSON.parse(ledgerText);
    const variant = { ...options };
    await modify({ db, backup, ledger, variant });
    const text = JSON.stringify(backup);
    variant.backupSha256 = digest(text);
    if (variant.currentLedgerText !== null) { variant.currentLedgerText = JSON.stringify(ledger); variant.currentLedgerSha256 = digest(variant.currentLedgerText); }
    await assert.rejects(() => restoreApplicationData(db, text, variant), pattern);
    await assertQuarantined(db);
    assert.equal(await count(db, "public.ev_messages"), 0);
    assert.equal(await count(db, "public.ev_knowledge_drafts"), 0);
    await assert.rejects(() => enableRecoveredReadAccess(db), /Completed isolated restore required/);
    await db.close();
  });
}
try {
  const source = await createSyntheticDatabase(); databases.push(source);
  await source.query("insert into auth.users(id,is_anonymous) values($1,true),($2,true),($3,false)", [A, B, OWNER]);
  await source.exec("insert into auth.sessions(id,user_id) select id,id from auth.users");
  await source.query("insert into ev_private.owners(user_id) values($1)", [OWNER]);
  await source.query("insert into public.ev_knowledge_drafts(id,author_id,title,body,provenance) values($1,$2,'Synthetic reviewed knowledge','Synthetic fact with a reviewed source.','Synthetic owner-approved fixture')", [DRAFT, OWNER]);
  for (const [c, user, app] of [[KEEP, A, "ev"], [DELETED, A, "ev"], [EXPIRED, A, "ev"], [OTHER, B, "cited"]]) {
    await source.query("insert into public.ev_conversations(id,user_id,app,created_at,expires_at,next_sequence) values($1,$2,$3,now()-interval '29 days',now()+interval '1 day',3)", [c, user, app]);
    const message = id(Number(c.slice(-12)) + 100);
    await source.query("insert into public.ev_messages(id,conversation_id,request_id,sequence,role,body) values($1,$2,$3,1,'user','Synthetic question'),($4,$2,$3,2,'assistant','Synthetic reply')", [id(Number(c.slice(-12)) + 200), c, c, message]);
    await source.query("insert into public.ev_answer_events(message_id,outcome,route,model,corpus_sha256,prompt_sha256) values($1,'answered','primary','synthetic-model',$2,$2)", [message, sha]);
    await source.query("insert into public.ev_feedback(message_id,user_id,helpful) values($1,$2,true)", [message, user]);
    await source.query("insert into public.ev_message_results(message_id,payload) values($1,$2::jsonb)", [message, JSON.stringify({ state: "answered", answer: "Synthetic reply" })]);
    await source.query("insert into ev_private.generation_requests(conversation_id,request_id,input_sha256,result) values($1,$1,$2,$3::jsonb)", [c, sha, JSON.stringify({ state: "answered", answer: "Synthetic reply" })]);
  }
  await source.query("update public.ev_conversations set created_at=now()-interval '31 days',expires_at=now()-interval '1 day' where id=$1", [EXPIRED]);
  for (let n = 0; n < 3; n++) await source.query("insert into public.ev_gap_reviews(id,question_key,diagnosis,status,note,expires_at) values($1,$2,'missing_content','new','Synthetic gap note',now()+($3::int * interval '1 day'))", [id(300 + n), `synthetic-gap-${n}`, n === 2 ? -1 : 1]);
  await source.query("insert into ev_private.editorial_receipts(request_id,actor_id,draft_id,input_sha256,revision,status) values($1,$2,$3,$4,1,'draft')", [id(400), OWNER, DRAFT, sha]);
  await source.query("insert into ev_private.deleted_conversations(conversation_id,deleted_at) values($1,now()-interval '1 day')", [id(700)]);
  const output = new URL("../.ev-preview/restore-qualification/", import.meta.url);
  await mkdir(output, { recursive: true });
  await check("encrypted application-only backup returns exact bytes through an actual file", async () => {
    const exported = await exportApplicationData(source, sourceId);
    const key = randomBytes(32), context = { kind: "application", sourceId };
    try {
      const encrypted = sealBackup(exported, key, context);
      await writeFile(new URL("synthetic-backup.enc.json", output), encrypted);
      const stored = await readFile(new URL("synthetic-backup.enc.json", output), "utf8");
      assert.ok(!stored.includes("Synthetic question") && !stored.includes("Synthetic reviewed knowledge"));
      backupText = openBackup(stored, key, context);
    } finally { key.fill(0); }
    assert.equal(backupText, exported);
    assert.deepEqual(Object.keys(JSON.parse(backupText).tables), TABLES);
    assert.ok(!/auth\.sessions|auth\.users|refresh_token|budget_private|ev_private\.owners/.test(backupText));
  });
  await source.query("delete from public.ev_conversations where id=$1", [DELETED]);
  await source.query("delete from public.ev_gap_reviews where id=$1", [id(301)]);
  await source.query("update ev_private.deleted_conversations set deleted_at=clock_timestamp() where conversation_id=$1", [id(700)]);
  await check("current ledger is captured after deletion, independently of backup", async () => {
    ledgerText = await exportCurrentDeletionLedger(source, sourceId);
    await writeFile(new URL("synthetic-current-ledger.json", output), ledgerText);
    assert.equal(JSON.parse(ledgerText).conversations.length, 2);
    assert.ok(JSON.parse(ledgerText).conversations.some((r) => r.conversation_id === DELETED));
    assert.equal(JSON.parse(backupText).tables["ev_private.deleted_conversations"].length, 1);
  });
  const draft = JSON.parse(backupText).tables["public.ev_knowledge_drafts"][0];
  options = { sourceId, backupSha256: digest(backupText), currentLedgerText: ledgerText, currentLedgerSha256: digest(ledgerText), approvedDrafts: [{ id: DRAFT, sha256: digest(JSON.stringify(draft)) }] };
  const restored = await destination();
  await check("runtime reads and definer RPCs are denied before loading", async () => {
    await assertQuarantined(restored);
    for (const role of ["anon", "authenticated", "service_role"]) {
      await identity(restored, role, A);
      await denied(restored, "select * from public.ev_conversations");
      await denied(restored, "select public.ev_create_conversation($1,'ev')", [id(999)]);
    }
    await identity(restored, "postgres");
  });
  let receipt;
  await check("isolated restore reconciles latest deletions and expiry before access", async () => {
    receipt = await restoreApplicationData(restored, backupText, options);
    assert.deepEqual(receipt, { mode: "current-ledger", reconciledConversations: 2, discardedGapReviews: 3, restoredDrafts: 1, restoredConversations: 2, authSessionsRestored: 0, budgetRowsRestored: 0, access: "disabled" });
    await assertQuarantined(restored);
  });
  await check("deleted and expired chat descendants are physically absent", async () => {
    for (const table of ["public.ev_messages", "public.ev_answer_events", "public.ev_feedback", "public.ev_message_results", "ev_private.generation_requests"]) assert.equal(await count(restored, table), table.endsWith("ev_messages") ? 4 : 2);
    assert.equal((await restored.query("select count(*)::int as n from public.ev_messages where conversation_id=any($1::uuid[])", [[DELETED, EXPIRED]])).rows[0].n, 0);
  });
  await check("all gap reviews are discarded because latest gap deletion evidence is unavailable", async () => assert.equal(await count(restored, "public.ev_gap_reviews"), 0));
  await check("ledger merge keeps the later deletion timestamp and all tombstones", async () => {
    const row = (await restored.query("select deleted_at::text as deleted_at from ev_private.deleted_conversations where conversation_id=$1", [id(700)])).rows[0];
    assert.equal(Date.parse(row.deleted_at), Date.parse(JSON.parse(ledgerText).conversations.find((r) => r.conversation_id === id(700)).deleted_at));
    assert.equal(await count(restored, "ev_private.deleted_conversations"), 3);
  });
  await check("eligible chat content, payloads and exact approved draft bytes survive", async () => {
    assert.equal((await restored.query("select body from public.ev_messages where id=$1", [id(110)])).rows[0].body, "Synthetic reply");
    assert.deepEqual((await restored.query("select to_jsonb(d) as row from public.ev_knowledge_drafts d")).rows[0].row, draft);
    assert.equal(await count(restored, "ev_private.editorial_receipts"), 1);
  });
  await check("no sessions, owner assignments or budget allowances were restored", async () => {
    assert.equal(await count(restored, "auth.sessions"), 0);
    assert.equal(await count(restored, "ev_private.owners"), 0);
    const tables = (await restored.query("select tablename from pg_tables where schemaname='budget_private'")).rows;
    for (const { tablename } of tables) assert.equal(await count(restored, `budget_private.${tablename}`), 0);
  });
  await check("a populated destination cannot be restored again", async () => await assert.rejects(() => restoreApplicationData(restored, backupText, options), /Fresh isolated destination/));
  await check("grants, RLS, policies, functions and constraints pass before read access", async () => {
    await enableRecoveredReadAccess(restored);
    const tables = (await restored.query("select relrowsecurity from pg_class where relnamespace in ('public'::regnamespace,'ev_private'::regnamespace,'budget_private'::regnamespace) and relkind='r'")).rows;
    assert.ok(tables.length > 10 && tables.every((r) => r.relrowsecurity));
  });
  await check("an old JWT-shaped claim has no active restored session", async () => {
    await identity(restored, "authenticated", A);
    assert.equal(await count(restored, "public.ev_conversations"), 0);
    await identity(restored, "postgres");
  });
  // Independent fresh synthetic sessions model post-recovery identity verification.
  await restored.query("insert into auth.sessions(id,user_id,aal) values($1,$2,'aal1'),($3,$4,'aal1'),($5,$6,'aal1')", [id(501), A, id(502), B, id(503), OWNER]);
  await restored.query("insert into ev_private.owners(user_id) values($1)", [OWNER]);
  await check("fresh guest A sees only its surviving conversation", async () => {
    await identity(restored, "authenticated", A, "aal1", id(501));
    assert.deepEqual((await restored.query("select id from public.ev_conversations")).rows.map((r) => r.id), [KEEP]);
    assert.equal(await count(restored, "public.ev_messages"), 2);
    assert.equal(await count(restored, "public.ev_knowledge_drafts"), 0);
  });
  await check("fresh guest B remains isolated and sees its Cited conversation", async () => {
    await identity(restored, "authenticated", B, "aal1", id(502));
    assert.deepEqual((await restored.query("select id from public.ev_conversations")).rows.map((r) => r.id), [OTHER]);
  });
  await check("owner AAL1 and forged AAL2 cannot read guest chats or knowledge", async () => {
    for (const aal of ["aal1", "aal2"]) {
      await identity(restored, "authenticated", OWNER, aal, id(503));
      assert.equal(await count(restored, "public.ev_conversations"), 0);
      assert.equal(await count(restored, "public.ev_knowledge_drafts"), 0);
    }
  });
  await check("independently verified synthetic owner AAL2 reads eligible records", async () => {
    await identity(restored, "postgres");
    await restored.query("update auth.sessions set aal='aal2' where id=$1", [id(503)]);
    await identity(restored, "authenticated", OWNER, "aal2", id(503));
    assert.equal(await count(restored, "public.ev_conversations"), 2);
    assert.equal(await count(restored, "public.ev_knowledge_drafts"), 1);
  });
  await check("recovery remains read-only including former column grants and definer writes", async () => {
    await denied(restored, "update public.ev_knowledge_drafts set title='Changed'");
    await denied(restored, "delete from public.ev_conversations");
    await denied(restored, "select public.ev_create_conversation($1,'ev')", [id(600)]);
    await denied(restored, "select public.ev_save_draft($1,$2,1,'x','x','x','draft')", [DRAFT, id(601)]);
  });
  await check("anonymous and service-role access remains denied after recovery", async () => {
    for (const role of ["anon", "service_role"]) {
      await identity(restored, role);
      await denied(restored, "select * from public.ev_messages");
      await denied(restored, "select public.ev_claim_generation($1,$2,$3,$4)", [A, KEEP, KEEP, sha]);
    }
    await identity(restored, "postgres");
  });
  await check("revoking a fresh session removes subsequent read access", async () => {
    await restored.query("delete from auth.sessions where id=$1", [id(501)]);
    await identity(restored, "authenticated", A, "aal1", id(501));
    assert.equal(await count(restored, "public.ev_messages"), 0);
    await identity(restored, "postgres");
  });
  await check("missing current ledger starts empty chats while approved knowledge survives", async () => {
    const db = await destination();
    const result = await restoreApplicationData(db, backupText, { ...options, currentLedgerText: null, currentLedgerSha256: null });
    assert.equal(result.mode, "empty-chats"); assert.equal(result.restoredConversations, 0); assert.equal(result.restoredDrafts, 1);
    for (const table of TABLES.filter((t) => !["public.ev_knowledge_drafts", "ev_private.editorial_receipts"].includes(t))) assert.equal(await count(db, table), 0);
    await enableRecoveredReadAccess(db); await db.close();
  });
  await check("unapproved knowledge and its receipts are omitted", async () => {
    const db = await destination();
    await restoreApplicationData(db, backupText, { ...options, approvedDrafts: [] });
    assert.equal(await count(db, "public.ev_knowledge_drafts"), 0); assert.equal(await count(db, "ev_private.editorial_receipts"), 0); await db.close();
  });
  await rejection("backup older than seven days fails closed", ({ backup }) => { backup.capturedAt = new Date(Date.now() - 8 * 86400000).toISOString(); }, /seven-day/);
  await rejection("future backup fails closed", ({ backup }) => { backup.capturedAt = new Date(Date.now() + 86400000).toISOString(); }, /seven-day/);
  await rejection("schema mismatch fails closed", ({ backup }) => { backup.schemaSha256 = "b".repeat(64); }, /schema mismatch/);
  await rejection("wrong source backup fails closed", ({ backup }) => { backup.sourceId = "another-source"; }, /source mismatch/);
  await rejection("stale ledger predating backup fails closed", ({ ledger }) => { ledger.capturedAt = new Date(Date.now() - 3600000).toISOString(); }, /not current/);
  await rejection("wrong-source ledger fails closed", ({ ledger }) => { ledger.sourceId = "another-source"; }, /source mismatch/);
  await rejection("future ledger fails closed", ({ ledger }) => { ledger.capturedAt = new Date(Date.now() + 3600000).toISOString(); }, /not current/);
  await rejection("ledger with future deletion fails closed", ({ ledger }) => { ledger.conversations[0].deleted_at = new Date(Date.now() + 3600000).toISOString(); }, /after ledger/);
  await rejection("extra auth-session table is rejected rather than imported", ({ backup }) => { backup.tables["auth.sessions"] = [{ id: A }]; }, /Unexpected fields/);
  await rejection("unexpected credential-like field is rejected", ({ backup }) => { backup.tables["public.ev_conversations"][0].refresh_token = "synthetic-not-a-token"; }, /Unexpected fields/);
  await rejection("changed approved draft cannot be silently restored", ({ backup }) => { backup.tables["public.ev_knowledge_drafts"][0].body = "Changed text"; }, /Approved draft/);
  await rejection("SQL constraint failure rolls back even earlier draft inserts", ({ backup }) => { backup.tables["public.ev_messages"][0].body = ""; }, { code: "23514" });
  await rejection("missing independent principal fails without recreating identity", async ({ db }) => { await db.query("delete from auth.users where id=$1", [A]); }, { code: "23503" });
  await rejection("preexisting application data refuses a merge restore", async ({ db }) => { await db.query("insert into public.ev_gap_reviews(question_key,diagnosis,status) values('synthetic-preexisting','missing_content','new')"); }, /must be empty/);
  await rejection("RLS drift prevents restore", async ({ db }) => { await db.exec("alter table public.ev_messages disable row level security"); }, /security drift/);
  await rejection("extra direct grant prevents restore", async ({ db }) => { await db.exec("grant select on public.ev_messages to service_role"); }, /security drift/);
  await rejection("unexpected schema access is revoked again on failure", async ({ db }) => { await db.exec("grant usage on schema public to service_role"); }, /must stay disabled/);
  await rejection("preexisting sessions prevent recovery", async ({ db }) => { await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [A]); }, /Sessions prohibited/);
  await rejection("preexisting owner assignments prevent recovery", async ({ db }) => { await db.query("insert into ev_private.owners(user_id) values($1)", [OWNER]); }, /Owner assignments/);
  await rejection("policy tampering is detected before loading", async ({ db }) => { await db.exec("drop policy ev_messages_read on public.ev_messages"); }, /security drift/);
  await rejection("definer-function tampering is detected before loading", async ({ db }) => { await db.exec("create or replace function ev_private.is_owner() returns boolean language sql as 'select true'"); }, /security drift/);
  await check("changed artifact bytes do not match external digest pins", async () => {
    const db = await destination();
    await assert.rejects(() => restoreApplicationData(db, backupText + " ", options), /Backup digest mismatch/);
    await assert.rejects(() => restoreApplicationData(db, backupText, { ...options, currentLedgerText: ledgerText + " " }), /ledger digest mismatch/);
    await assertQuarantined(db); await db.close();
  });
  await check("security drift after loading still prevents access and retains quarantine", async () => {
    const db = await destination(); await restoreApplicationData(db, backupText, options);
    await db.exec("grant update(title) on public.ev_knowledge_drafts to authenticated");
    await assert.rejects(() => enableRecoveredReadAccess(db), /security drift/);
    await assertQuarantined(db); await db.close();
  });
  await check("source retains its own independent data and sessions", async () => {
    assert.equal(await count(source, "auth.sessions"), 3);
    assert.equal(await count(source, "public.ev_conversations"), 3);
    assert.equal(await count(source, "public.ev_gap_reviews"), 2);
  });
  await check("legacy conversation reconciliation alone leaves expired gaps behind", async () => {
    const legacy = await createSyntheticDatabase(); databases.push(legacy);
    await legacy.exec("insert into public.ev_gap_reviews(question_key,diagnosis,status,expires_at) values('synthetic-legacy-expired','missing_content','new',now()-interval '1 day')");
    await legacy.exec("select ev_private.reconcile_restored_conversations()");
    assert.equal(await count(legacy, "public.ev_gap_reviews"), 1);
    await legacy.close();
  });
  const evidence = { scope: "Local PGlite synthetic application-data serialization/restore; no managed restore, real Auth, provider calls or live target", passed, checks, receipt, elapsedMs: Math.round(performance.now() - start), backupSha256: digest(backupText), ledgerSha256: digest(ledgerText) };
  await writeFile(new URL("result.json", output), JSON.stringify(evidence, null, 2) + "\n");
  console.log(`${passed} isolated application-data restore checks passed`);
} catch (error) {
  console.error(`Restore qualification failed after ${passed} checks: ${error.message}`);
  process.exitCode = 1;
} finally {
  for (const db of databases) if (!db.closed) await db.close();
}
