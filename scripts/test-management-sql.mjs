import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ownerOperationsChecks } from "./test-owner-operations-sql.mjs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const A = "10000000-0000-4000-8000-000000000001", B = "10000000-0000-4000-8000-000000000002", OWNER = "10000000-0000-4000-8000-000000000003";
const CA = "20000000-0000-4000-8000-000000000001", CB = "20000000-0000-4000-8000-000000000002";
const RA = "30000000-0000-4000-8000-000000000001", RB = "30000000-0000-4000-8000-000000000002";
const sha = "a".repeat(64);
let userMessage, assistantMessage, draftId;
let passed = 0;
const failures = [];
async function as(role, user = null, aal = "aal1", anonymous = true) {
  assert.ok(["postgres", "anon", "authenticated", "service_role"].includes(role));
  await db.exec("reset role");
  if(user) await db.query("update auth.sessions set aal=$1 where user_id=$2",[aal,user]);
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(user ? { sub: user, session_id: user, aal, is_anonymous: anonymous } : {})]);
  if (role !== "postgres") await db.exec(`set role ${role}`);
}
async function check(label, fn) {
  try { await fn(); passed++; console.log(`PASS ${label}`); }
  catch (error) { failures.push(label); console.error(`FAIL ${label}: ${error.message}`); }
}
async function denied(sql, params = []) { await assert.rejects(() => db.query(sql, params), { code: "42501" }); }
async function count(table) { assert.match(table, /^(public|ev_private)\.ev_?[a-z_]+$|^public\.ev_[a-z_]+$/); return Number((await db.query(`select count(*)::integer as n from ${table}`)).rows[0].n); }
const assistantSql = "select public.ev_append_assistant_message($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as id";
const assistantArgs = [A, CA, RA, "A sourced sample answer.", "answered", "primary", "synthetic-model", ["services.md"], ["services.md"], 1000, sha, sha];
try {
  await db.exec(await readFile(new URL("../supabase/tests/auth-fixture.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609080001_ev_management.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090001_ev_active_sessions.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090002_ev_generation_receipts.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090003_ev_retention_recovery.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090004_ev_owner_session.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090005_ev_owner_operations.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090006_ev_shared_budget.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090007_ev_answer_events.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609090008_ev_live_gap_reviews.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users(id) values($1),($2),($3)", [A,B,OWNER]);
  await db.query("update auth.users set is_anonymous=false where id=$1",[OWNER]);
  await db.exec("insert into auth.sessions(id,user_id) select id,id from auth.users");
  await db.query("insert into ev_private.owners(user_id) values($1)", [OWNER]);
  await check("every exposed E.V table has RLS enabled", async () => {
    const rows = (await db.query("select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'ev_%'")).rows;
    assert.equal(rows.length, 7); assert.ok(rows.every((r) => r.relrowsecurity));
  });
  await check("unauthenticated visitors cannot read, write or call entrypoints", async () => {
    await as("anon");
    for (const table of ["ev_conversations","ev_messages","ev_answer_events","ev_feedback","ev_knowledge_drafts","ev_gap_reviews"]) await denied(`select * from public.${table}`);
    await denied("select public.ev_create_conversation($1,'ev')", [CA]);
    await denied("select public.ev_purge_expired()");
    await denied("select * from ev_private.owners");
  });
  await check("guest A can create and retry its own conversation", async () => {
    await as("authenticated", A);
    assert.equal((await db.query("select public.ev_create_conversation($1,'ev') as id", [CA])).rows[0].id, CA);
    await db.query("select public.ev_create_conversation($1,'ev')", [CA]);
    assert.equal(await count("public.ev_conversations"), 1);
  });
  await check("guest B cannot claim or see guest A's conversation", async () => {
    await as("authenticated", B);
    assert.equal(await count("public.ev_conversations"), 0);
    await denied("select public.ev_create_conversation($1,'ev')", [CA]);
    await db.query("select public.ev_create_conversation($1,'cited')", [CB]);
    assert.equal(await count("public.ev_conversations"), 1);
  });
  await check("conversation scope cannot change on an idempotent retry", async () => {
    await as("authenticated", A);
    await denied("select public.ev_create_conversation($1,'cited')", [CA]);
  });
  await check("guest A cannot forge ownership, extend expiry or append raw table rows", async () => {
    await as("authenticated", A);
    await denied("update public.ev_conversations set user_id=$1 where id=$2", [B, CA]);
    await denied("update public.ev_conversations set expires_at=now()+interval '1 year' where id=$1", [CA]);
    await denied("insert into public.ev_conversations(id,user_id,app) values(gen_random_uuid(),$1,'ev')", [A]);
    await denied("insert into public.ev_messages(conversation_id,request_id,sequence,role,body) values($1,$2,1,'assistant','forged')", [CA,RA]);
  });
  await check("visitor message retries are idempotent and reject changed text", async () => {
    await as("authenticated", A);
    userMessage = (await db.query("select public.ev_append_user_message($1,$2,$3) as id", [CA,RA,"A sample question?"])).rows[0].id;
    assert.equal((await db.query("select public.ev_append_user_message($1,$2,$3) as id", [CA,RA,"A sample question?"])).rows[0].id, userMessage);
    await assert.rejects(() => db.query("select public.ev_append_user_message($1,$2,$3)", [CA,RA,"Changed question"]), { code: "22000" });
    assert.equal(await count("public.ev_messages"), 1);
  });
  await check("guest B cannot append into A, read A's messages or erase A", async () => {
    await as("authenticated", B);
    await denied("select public.ev_append_user_message($1,$2,$3)", [CA,RB,"Injected question"]);
    assert.equal(await count("public.ev_messages"), 0);
    assert.equal((await db.query("delete from public.ev_conversations where id=$1 returning id", [CA])).rows.length, 0);
  });
  await check("client roles cannot write assistant events or run retention", async () => {
    await as("authenticated", A);
    await denied(assistantSql, assistantArgs);
    await denied("select public.ev_purge_expired()");
    await denied("insert into public.ev_answer_events(message_id,outcome,route,corpus_sha256,prompt_sha256) values($1,'answered','primary',$2,$2)", [userMessage,sha]);
  });
  await check("server append requires an existing user turn and correct user", async () => {
    await as("service_role");
    await denied(assistantSql, [B, ...assistantArgs.slice(1)]);
    await denied(assistantSql, [A,CA,RB,...assistantArgs.slice(3)]);
  });
  await check("assistant response and trace save atomically and retry once", async () => {
    await as("service_role");
    assistantMessage = (await db.query(assistantSql, assistantArgs)).rows[0].id;
    assert.equal((await db.query(assistantSql, assistantArgs)).rows[0].id, assistantMessage);
    await assert.rejects(() => db.query(assistantSql, [...assistantArgs.slice(0,3), "Changed answer", ...assistantArgs.slice(4)]), { code: "22000" });
    const changedTrace = [...assistantArgs]; changedTrace[6] = "different-model";
    await assert.rejects(() => db.query(assistantSql, changedTrace), { code: "22000" });
    await as("authenticated", A);
    const rows = (await db.query("select sequence,role from public.ev_messages order by sequence")).rows;
    assert.deepEqual(rows, [{ sequence: 1, role: "user" },{ sequence: 2, role: "assistant" }]);
    assert.equal(await count("public.ev_answer_events"),0);
    await as("authenticated",OWNER,"aal2",false); assert.equal(await count("public.ev_answer_events"),1);
  });
  await check("invalid trace rolls back the entire assistant append", async () => {
    await as("authenticated", A);
    await db.query("select public.ev_append_user_message($1,$2,$3)",[CA,RB,"Another question"]);
    await as("service_role");
    const args = [...assistantArgs]; args[2]=RB; args[10]="invalid-sha";
    await assert.rejects(() => db.query(assistantSql,args), { code: "23514" });
    await as("authenticated", A);
    assert.equal(await count("public.ev_messages"),3); assert.equal(await count("public.ev_answer_events"),0);
    await as("authenticated",OWNER,"aal2",false); assert.equal(await count("public.ev_answer_events"),1);
    assert.equal((await db.query("select next_sequence from public.ev_conversations where id=$1",[CA])).rows[0].next_sequence,4);
  });
  await check("feedback belongs to the message owner and only rates assistant turns", async () => {
    await as("authenticated", B); await denied("select public.ev_set_feedback($1,true)",[assistantMessage]);
    await as("authenticated", A); await denied("select public.ev_set_feedback($1,true)",[userMessage]);
    await db.query("select public.ev_set_feedback($1,true)",[assistantMessage]);
    await db.query("select public.ev_set_feedback($1,false)",[assistantMessage]);
    assert.equal(await count("public.ev_feedback"),1);
    assert.equal((await db.query("select helpful from public.ev_feedback")).rows[0].helpful,false);
    await as("authenticated", B); assert.equal(await count("public.ev_answer_events"),0); assert.equal(await count("public.ev_feedback"),0);
  });
  await check("owner identity without MFA cannot inspect other guests or editorial rows", async () => {
    await as("authenticated", OWNER,"aal1",false);
    assert.equal(await count("public.ev_conversations"),0); assert.equal(await count("public.ev_messages"),0);
    assert.equal(await count("public.ev_knowledge_drafts"),0);
    await denied("insert into public.ev_knowledge_drafts(title,body,provenance) values('Draft','Sample fact','Owner source')");
  });
  await check("guest cannot self-promote through owner role or JWT metadata", async () => {
    await as("authenticated", A,"aal2",false);
    await denied("insert into ev_private.owners(user_id) values($1)",[A]);
    await denied("select * from ev_private.owners");
    await denied("insert into public.ev_knowledge_drafts(title,body,provenance) values('Forged','Fact','Claim')");
  });
  await check("MFA owner can review current records and prepare knowledge", async () => {
    await as("authenticated",OWNER,"aal2",false);
    assert.equal(await count("public.ev_conversations"),2); assert.equal(await count("public.ev_messages"),3);
    draftId="90000000-0000-4000-8000-000000000001"; await db.query("select public.ev_save_draft($1,gen_random_uuid(),0,'Verified source','Sample verified fact','Owner confirmation','draft')",[draftId]);
    await db.query("select public.ev_save_draft($1,gen_random_uuid(),1,'Verified source','Sample verified fact','Owner confirmation','ready_for_review')",[draftId]);
    await db.query("select public.ev_review_gap($1,gen_random_uuid(),0,'missing_content','drafted','Source checked',$2)",[assistantMessage,draftId]);
    assert.equal(await count("public.ev_gap_reviews"),1);
    assert.equal((await db.query("select revision from public.ev_knowledge_drafts where id=$1",[draftId])).rows[0].revision,2);
  });
  await check("editorial status cannot publish knowledge or grant access", async () => {
    await as("authenticated",OWNER,"aal2",false);
    await denied("update public.ev_knowledge_drafts set status='published' where id=$1",[draftId]);
    await denied("update public.ev_knowledge_drafts set author_id=$1 where id=$2",[A,draftId]);
    await denied(assistantSql, assistantArgs);
  });
  await check("other visitors cannot read or change owner drafts and gap reviews", async () => {
    await as("authenticated",A);
    assert.equal(await count("public.ev_knowledge_drafts"),0); assert.equal(await count("public.ev_gap_reviews"),0);
    await denied("update public.ev_knowledge_drafts set title='Overwrite' where id=$1 returning id",[draftId]);
    await denied("delete from public.ev_knowledge_drafts where id=$1 returning id",[draftId]);
  });
  await check("an anonymous identity cannot use an owner row even with an MFA claim", async () => {
    await as("authenticated",OWNER,"aal2",true);
    assert.equal(await count("public.ev_messages"),0); assert.equal(await count("public.ev_knowledge_drafts"),0);
  });
  await check("30-day expiry hides records from both guest and MFA owner before purge", async () => {
    await as("postgres");
    await db.query("update public.ev_conversations set created_at=now()-interval '31 days',expires_at=now()-interval '1 day' where id=$1",[CA]);
    await db.exec("update public.ev_gap_reviews set expires_at=now()-interval '1 day'");
    for (const user of [A,OWNER]) {
      await as("authenticated",user,"aal2",false);
      assert.equal(await count("public.ev_messages"),0); assert.equal(await count("public.ev_answer_events"),0); assert.equal(await count("public.ev_feedback"),0);
      await denied("select public.ev_append_user_message($1,$2,$3)",[CA,RA,"A sample question?"]);
    }
    await as("authenticated",OWNER,"aal2",false); assert.equal(await count("public.ev_gap_reviews"),0);
  });
  await check("retention removes raw child records and writes a content-free receipt", async () => {
    await as("service_role"); assert.equal((await db.query("select public.ev_purge_expired() as n")).rows[0].n,1);
    await as("postgres");
    assert.equal(await count("public.ev_messages"),0); assert.equal(await count("public.ev_answer_events"),0); assert.equal(await count("public.ev_feedback"),0);
    const receipt=(await db.query("select conversations_deleted,gap_reviews_deleted from ev_private.retention_runs")).rows[0];
    assert.deepEqual(receipt,{conversations_deleted:1,gap_reviews_deleted:1});
    assert.equal(await count("public.ev_knowledge_drafts"),1);
  });
  await check("guests can delete their own conversation", async () => {
    await as("authenticated",B); assert.equal((await db.query("delete from public.ev_conversations where id=$1 returning id",[CB])).rows.length,1);
  });
  await check("bounded conversation creation rejects the thirteenth active session", async () => {
    await as("authenticated", B);
    for (let i=1;i<=12;i++) await db.query("select public.ev_create_conversation($1,'ev')",[`40000000-0000-4000-8000-${String(i).padStart(12,"0")}`]);
    await assert.rejects(() => db.query("select public.ev_create_conversation($1,'ev')",["40000000-0000-4000-8000-000000000013"]), {code:"54000"});
  });
  await check("bounded transcript length permits idempotent retries at the limit", async () => {
    await as("authenticated", B);
    const conversation="40000000-0000-4000-8000-000000000001";
    for (let i=1;i<=80;i++) await db.query("select public.ev_append_user_message($1,$2,'Bounded sample')",[conversation,`50000000-0000-4000-8000-${String(i).padStart(12,"0")}`]);
    await db.query("select public.ev_append_user_message($1,$2,'Bounded sample')",[conversation,"50000000-0000-4000-8000-000000000080"]);
    await assert.rejects(() => db.query("select public.ev_append_user_message($1,$2,'Over the limit')",[conversation,"50000000-0000-4000-8000-000000000081"]),{code:"54000"});
  });
  await check("the server role has no broad raw transcript table grants", async () => {
    await as("service_role"); await denied("select * from public.ev_messages"); await denied("delete from public.ev_conversations");
  });
  await check("a generation claim is server-only, stable and cannot be reclaimed",async()=>{
    await as("authenticated",B);
    await denied("select public.ev_claim_generation($1,$2,$3,$4)",[B,"40000000-0000-4000-8000-000000000001","50000000-0000-4000-8000-000000000001",sha]);
    await as("service_role");
    const args=[B,"40000000-0000-4000-8000-000000000001","50000000-0000-4000-8000-000000000001",sha];
    assert.deepEqual((await db.query("select public.ev_claim_generation($1,$2,$3,$4) as claim",args)).rows[0].claim,{claimed:true,result:null});
    assert.deepEqual((await db.query("select public.ev_claim_generation($1,$2,$3,$4) as claim",args)).rows[0].claim,{claimed:false,result:null});
    await assert.rejects(()=>db.query("select public.ev_claim_generation($1,$2,$3,$4)",[...args.slice(0,3),"b".repeat(64)]),{code:"22000"});
  });
  await check("a completed generation is atomic, immutable and replayable without another claim",async()=>{
    await as("service_role");
    const args=[B,"40000000-0000-4000-8000-000000000001","50000000-0000-4000-8000-000000000001",sha];
    const payload={state:"unavailable"};
    const query="select public.ev_complete_generation($1,$2,$3,$4,$5::jsonb) as id";
    const result=(await db.query(query,[...args,JSON.stringify(payload)])).rows[0].id;
    assert.equal((await db.query(query,[...args,JSON.stringify(payload)])).rows[0].id,result);
    await assert.rejects(()=>db.query(query,[...args,JSON.stringify({state:"not-covered",answer:"Changed"})]),{code:"22000"});
    assert.deepEqual((await db.query("select public.ev_claim_generation($1,$2,$3,$4) as claim",args)).rows[0].claim,{claimed:false,result:payload});
    await as("authenticated",B);
    assert.deepEqual((await db.query("select payload from public.ev_message_results where message_id=$1",[result])).rows[0].payload,payload);
    await as("authenticated",A);assert.equal(await count("public.ev_message_results"),0);
    await denied("insert into public.ev_message_results(message_id,payload) values($1,$2::jsonb)",[result,JSON.stringify(payload)]);
  });
  await check("revoked sessions cannot read, delete or use guest SECURITY DEFINER RPCs",async()=>{
    await as("postgres");await db.query("delete from auth.sessions where user_id=$1",[B]);
    await as("authenticated",B);
    assert.equal(await count("public.ev_conversations"),0);
    assert.equal((await db.query("delete from public.ev_conversations returning id")).rows.length,0);
    await denied("select public.ev_create_conversation(gen_random_uuid(),'ev')");
    await denied("select public.ev_append_user_message($1,gen_random_uuid(),'Revoked write')",["40000000-0000-4000-8000-000000000001"]);
    await denied("select public.ev_set_feedback($1,true)",[assistantMessage]);
  });
  await check("expired session and stale MFA claim cannot inspect owner data",async()=>{
    await as("postgres");await db.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1",[OWNER]);
    await as("authenticated",OWNER,"aal2",false);
    assert.equal(await count("public.ev_knowledge_drafts"),0);
    await as("postgres");await db.query("update auth.sessions set not_after=null where user_id=$1",[OWNER]);
    await as("authenticated",OWNER,"aal2",false);
    await db.exec("reset role");await db.query("update auth.sessions set aal='aal1' where user_id=$1",[OWNER]);await db.exec("set role authenticated");
    assert.equal(await count("public.ev_knowledge_drafts"),0);
  });
  await check("missing and malformed session claims fail closed",async()=>{
    await as("authenticated",A);
    for(const session_id of [null,"not-a-uuid",B]){
      await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:A,session_id,aal:"aal1",is_anonymous:true})]);
      assert.equal((await db.query("select ev_private.active_session() as active")).rows[0].active,false);
      await denied("select public.ev_create_conversation(gen_random_uuid(),'ev')");
    }
  });
  await check("owner session status separates trusted owner registration from current MFA",async()=>{
    await as("anon");await denied("select public.ev_owner_session_state()");
    await as("authenticated",A,"aal2",false);
    assert.deepEqual((await db.query("select public.ev_owner_session_state() s")).rows[0].s,{owner:false,assured:false});
    await as("authenticated",OWNER,"aal1",false);
    assert.deepEqual((await db.query("select public.ev_owner_session_state() s")).rows[0].s,{owner:true,assured:false});
    await as("authenticated",OWNER,"aal2",false);
    assert.deepEqual((await db.query("select public.ev_owner_session_state() s")).rows[0].s,{owner:true,assured:true});
  });
  await check("deletion tombstones contain identifiers only and cannot be read by API roles",async()=>{
    await as("postgres");
    assert.equal((await db.query("select count(*)::integer n from ev_private.deleted_conversations where conversation_id=any($1::uuid[])",[[CA,CB]])).rows[0].n,2);
    assert.deepEqual((await db.query("select column_name from information_schema.columns where table_schema='ev_private' and table_name='deleted_conversations' order by ordinal_position")).rows.map(r=>r.column_name),["conversation_id","deleted_at"]);
    for(const role of ["anon","authenticated","service_role"]){await as(role,A);await denied("select * from ev_private.deleted_conversations");await denied("select ev_private.run_maintenance()");await denied("select ev_private.reconcile_restored_conversations()");}
  });
  await check("restore reconciliation removes previously deleted and expired transcripts with all children",async()=>{
    await as("postgres");
    await db.query("insert into public.ev_conversations(id,user_id,app) values($1,$2,'ev')",[CA,A]);
    await db.query("insert into public.ev_messages(conversation_id,request_id,sequence,role,body) values($1,$2,1,'user','Restored synthetic deleted question')",[CA,RA]);
    const expired="60000000-0000-4000-8000-000000000001";
    await db.query("insert into public.ev_conversations(id,user_id,app,created_at,expires_at) values($1,$2,'ev',now()-interval '31 days',now()-interval '1 day')",[expired,A]);
    const before=(await db.query("select deleted_at from ev_private.deleted_conversations where conversation_id=$1",[CA])).rows[0].deleted_at;
    assert.equal((await db.query("select ev_private.reconcile_restored_conversations() n")).rows[0].n,2);
    assert.equal((await db.query("select count(*)::integer n from public.ev_messages where conversation_id=$1",[CA])).rows[0].n,0);
    assert.equal(new Date((await db.query("select deleted_at from ev_private.deleted_conversations where conversation_id=$1",[CA])).rows[0].deleted_at).getTime(),new Date(before).getTime());
    assert.equal((await db.query("select ev_private.reconcile_restored_conversations() n")).rows[0].n,0);
  });
  await check("inactive anonymous cleanup preserves recent accounts, active chats and permanent or owner identities",async()=>{
    await as("postgres");
    const ids=Array.from({length:6},(_,i)=>`70000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`);
    for(const id of ids) await db.query("insert into auth.users(id,created_at) values($1,now()-interval '31 days')",[id]);
    await db.query("update auth.users set last_sign_in_at=now() where id=$1",[ids[1]]);
    await db.query("update auth.users set created_at=now() where id=$1",[ids[2]]);
    await db.query("update auth.users set is_anonymous=false where id=$1",[ids[3]]);
    await db.query("insert into ev_private.owners(user_id,enabled) values($1,false)",[ids[4]]);
    await db.query("insert into public.ev_conversations(id,user_id,app) values(gen_random_uuid(),$1,'ev')",[ids[5]]);
    const result=(await db.query("select ev_private.run_maintenance() result")).rows[0].result;
    assert.equal(result.anonymous_users_deleted,1);
    assert.equal((await db.query("select count(*)::integer n from auth.users where id=any($1::uuid[])",[ids])).rows[0].n,5);
    assert.equal((await db.query("select count(*)::integer n from auth.users where id=$1",[ids[0]])).rows[0].n,0);
  });
  await check("retention batches stop at 1000 and a later run drains the backlog",async()=>{
    await as("postgres");
    await db.query("insert into public.ev_conversations(id,user_id,app,created_at,expires_at) select gen_random_uuid(),$1,'ev',now()-interval '31 days',now()-interval '1 day' from generate_series(1,1001)",[A]);
    assert.equal((await db.query("select public.ev_purge_expired() n")).rows[0].n,1000);
    assert.equal((await db.query("select public.ev_purge_expired() n")).rows[0].n,1);
  });
  await check("maintenance removes expired operational records and preserves recent deletion evidence",async()=>{
    await as("postgres");
    await db.query("insert into ev_private.deleted_conversations(conversation_id,deleted_at) values($1,now()-interval '46 days')",["80000000-0000-4000-8000-000000000001"]);
    await db.exec("insert into ev_private.retention_runs(ran_at,conversations_deleted,gap_reviews_deleted) values(now()-interval '91 days',0,0)");
    await db.exec("select ev_private.run_maintenance()");
    assert.equal((await db.query("select count(*)::integer n from ev_private.deleted_conversations where deleted_at < now()-interval '45 days'")).rows[0].n,0);
    assert.equal((await db.query("select count(*)::integer n from ev_private.retention_runs where ran_at < now()-interval '90 days'")).rows[0].n,0);
    assert.equal((await db.query("select count(*)::integer n from ev_private.deleted_conversations where conversation_id=$1",[CA])).rows[0].n,1);
  });
  await ownerOperationsChecks({db,as,check,denied,owner:OWNER,guest:A});
  console.log(`\n${passed} database checks passed; ${failures.length} failed. Local PostgreSQL only; real Auth, MFA and multi-connection qualification remain separate.`);
  if(failures.length) process.exitCode=1;
} finally { await db.close(); }

