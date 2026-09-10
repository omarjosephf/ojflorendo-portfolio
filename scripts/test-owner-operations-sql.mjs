import assert from 'node:assert/strict';
export async function ownerOperationsChecks({db,as,check,denied,owner,guest}) {
 const draft='91000000-0000-4000-8000-000000000001',request='92000000-0000-4000-8000-000000000001';
 let baseline;
 const save="select public.ev_save_draft($1,$2,$3,$4,$5,$6,$7) saved";
 const args=[draft,request,0,'Verified synthetic source','Synthetic fact','Synthetic owner evidence','draft'];
 await check('owner operations reject guests, AAL1 and direct editorial table writes',async()=>{
  for(const [u,aal,anon] of [[guest,'aal2',true],[owner,'aal1',false]]){
   await as('authenticated',u,aal,anon);await denied(save,args);await denied('select public.ev_owner_report(7)');await denied('select public.ev_draft_history($1)',[draft]);
  }
  await as('authenticated',owner,'aal2',false);await denied("insert into public.ev_knowledge_drafts(title,body,provenance) values('x','x','x')");
 });
 await check('a draft retry returns its original receipt and creates only one revision',async()=>{
  await as('authenticated',owner,'aal2',false);
  const first=(await db.query(save,args)).rows[0].saved;assert.deepEqual(first,{id:draft,revision:1});
  assert.deepEqual((await db.query(save,args)).rows[0].saved,first);
  const history=(await db.query('select public.ev_draft_history($1) history',[draft])).rows[0].history;
  assert.equal(history.length,1);assert.equal(history[0].actor_id,owner);assert.equal(history[0].revision,1);assert.ok(!JSON.stringify(history).includes('Synthetic fact'));
 });
 await check('conflicting request IDs, stale revisions and publishing are rejected',async()=>{
  await as('authenticated',owner,'aal2',false);
  await assert.rejects(()=>db.query(save,args.map((v,i)=>i===4?'Different fact':v)),{code:'PT409'});
  await assert.rejects(()=>db.query(save,args.map((v,i)=>i===1?'92000000-0000-4000-8000-000000000002':v)),{code:'PT409'});
  await assert.rejects(()=>db.query(save,args.map((v,i)=>i===6?'published':v)),{code:'22023'});
  const update=[...args];update[1]='92000000-0000-4000-8000-000000000003';update[2]=1;update[4]='Updated synthetic fact';update[6]='ready_for_review';
  assert.equal((await db.query(save,update)).rows[0].saved.revision,2);
  assert.equal((await db.query(save,args)).rows[0].saved.revision,1);
  assert.equal((await db.query('select revision from public.ev_knowledge_drafts where id=$1',[draft])).rows[0].revision,2);
 });
 await check('live reports use retained E.V questions and show incomplete telemetry honestly',async()=>{
  await as('authenticated',owner,'aal2',false);baseline=(await db.query('select public.ev_owner_report(7) report')).rows[0].report;
  await as('postgres');
  const c='93000000-0000-4000-8000-000000000001',other='93000000-0000-4000-8000-000000000002';
  await db.query("insert into public.ev_conversations(id,user_id,app) values($1,$3,'ev'),($2,$3,'cited')",[c,other,guest]);
  await db.query("insert into public.ev_messages(conversation_id,request_id,sequence,role,body) values($1,gen_random_uuid(),1,'user','SYNTHETIC repeated question'),($1,gen_random_uuid(),2,'user','synthetic  repeated question'),($1,gen_random_uuid(),3,'user','Synthetic unanswered question'),($2,gen_random_uuid(),1,'user','Cited-only question')",[c,other]);
  const qs=(await db.query('select request_id from public.ev_messages where conversation_id=$1 order by sequence',[c])).rows;
  for(let i=0;i<2;i++)await db.query("insert into public.ev_messages(conversation_id,request_id,sequence,role,body) values($1,$2,$3,'assistant','Synthetic answer')",[c,qs[i].request_id,4+i]);
  const a=(await db.query("select id from public.ev_messages where conversation_id=$1 and role='assistant' order by sequence",[c])).rows[0].id;
  await db.query("insert into public.ev_answer_events(message_id,outcome,route,cited,retrieved,corpus_sha256,prompt_sha256) values($1,'answered','primary',array['sample.md','sample.md'],array['sample.md'],$2,$2)",[a,'a'.repeat(64)]);
  await db.query('insert into public.ev_feedback(message_id,user_id,helpful) values($1,$2,true)',[a,guest]);
  await as('authenticated',owner,'aal2',false);
  const r=(await db.query('select public.ev_owner_report(7) report')).rows[0].report;
  assert.equal(r.questions,baseline.questions+3);assert.equal(r.replies,baseline.replies+2);assert.equal(r.events,baseline.events+1);assert.equal(r.feedback,baseline.feedback+1);assert.equal(r.helpful,baseline.helpful+1);assert.equal(r.conversations,baseline.conversations+1);assert.equal(r.truncated,false);
  assert.equal(r.topQuestions.find(q=>q.question==='synthetic repeated question').count,2);assert.equal(r.sources.find(s=>s.source==='sample.md').citations,1);assert.equal(r.outcomes.answered,(baseline.outcomes.answered??0)+1);
  await assert.rejects(()=>db.query('select public.ev_owner_report(365)'),{code:'22023'});
 });
 await check('report limits are explicit and deletion removes its questions from reports',async()=>{
  await as('postgres');const c='94000000-0000-4000-8000-000000000001';
  await db.query("insert into public.ev_conversations(id,user_id,app) values($1,$2,'ev')",[c,guest]);
  await db.query("insert into public.ev_messages(conversation_id,request_id,sequence,role,body) select $1,gen_random_uuid(),i,'user','Synthetic bounded report' from generate_series(1,1001) i",[c]);
  await as('authenticated',owner,'aal2',false);let r=(await db.query('select public.ev_owner_report(7) report')).rows[0].report;assert.equal(r.questions,1000);assert.equal(r.truncated,true);
  await as('postgres');await db.query('delete from public.ev_conversations where id=$1',[c]);
  await as('authenticated',owner,'aal2',false);r=(await db.query('select public.ev_owner_report(7) report')).rows[0].report;assert.equal(r.questions,baseline.questions+3);assert.equal(r.truncated,false);
 });
 await check('private editorial receipts deny all API roles',async()=>{
  for(const role of ['anon','authenticated','service_role']){await as(role,owner,'aal2',false);await denied('select * from ev_private.editorial_receipts');}
 });
}
