import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/[\\/]$/,'');
const db=new PGlite();
const U='10000000-0000-4000-8000-000000000001',O='10000000-0000-4000-8000-000000000002',B='10000000-0000-4000-8000-000000000003',C='20000000-0000-4000-8000-000000000001',R='30000000-0000-4000-8000-000000000001',D='40000000-0000-4000-8000-000000000001';
let M,passed=0;
const uuid=n=>`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function role(name,user=U,aal='aal1'){
 await db.exec('reset role');await db.query('update auth.sessions set aal=$1 where user_id=$2',[aal,user]);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,session_id:user,aal,is_anonymous:user===U})]);
 if(name!=='postgres')await db.exec(`set role ${name}`);
}
async function check(label,fn){await fn();passed++;console.log(`PASS ${label}`);}
async function gaps(){return (await db.query('select public.ev_owner_gaps() data')).rows[0].data;}
async function save(n,revision,diagnosis='unclassified',status='investigating',note='Synthetic review note',draft=null){return (await db.query('select public.ev_review_gap($1,$2,$3,$4,$5,$6,$7) data',[M,uuid(n),revision,diagnosis,status,note,draft])).rows[0].data;}
try{
 await db.exec(await readFile(root+'/supabase/tests/auth-fixture.sql','utf8'));
 for(const name of (await readdir(root+'/supabase/migrations')).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(root+'/supabase/migrations/'+name,'utf8'));
 await db.query('insert into auth.users(id,is_anonymous) values($1,true),($2,false),($3,false)',[U,O,B]);await db.exec('insert into auth.sessions(id,user_id) select id,id from auth.users');await db.query('insert into ev_private.owners(user_id) values($1)',[O]);
 await role('authenticated');await db.query("select public.ev_create_conversation($1,'ev')",[C]);await db.query("select public.ev_append_user_message($1,$2,'Synthetic unsupported question')",[C,R]);
 await role('service_role');await db.query('select public.ev_claim_generation($1,$2,$3,$4)',[U,C,R,'a'.repeat(64)]);M=(await db.query('select public.ev_complete_generation($1,$2,$3,$4,$5) id',[U,C,R,'a'.repeat(64),{state:'not-covered',answer:'Synthetic unsupported answer',modelRoute:'primary'}])).rows[0].id;
 await check('guest cannot query or save gap reviews',async()=>{await role('authenticated');await assert.rejects(gaps,{code:'42501'});await assert.rejects(()=>save(1,0),{code:'42501'});});
 await check('owner AAL1 cannot inspect the queue',async()=>{await role('authenticated',O);await assert.rejects(gaps,{code:'42501'});});
 await check('unsupported reply is unclassified and is paired with its actual question',async()=>{await role('authenticated',O,'aal2');const rows=await gaps();assert.equal(rows.length,1);assert.equal(rows[0].diagnosis,'unclassified');assert.equal(rows[0].observed,'not-covered');assert.equal(rows[0].question,'Synthetic unsupported question');assert.equal(rows[0].revision,0);});
 await check('first save creates one revision and stable replay creates none',async()=>{assert.deepEqual(await save(1,0),{messageId:M,revision:1});assert.deepEqual(await save(1,0),{messageId:M,revision:1});assert.equal((await gaps())[0].note,'Synthetic review note');});
 await check('changed replay and stale editor conflict without replacing the note',async()=>{await assert.rejects(()=>save(1,0,'missing_content'),{code:'PT409'});await assert.rejects(()=>save(2,0),{code:'PT409'});assert.equal((await gaps())[0].revision,1);});
 await check('direct writes cannot bypass revision checks',async()=>{await assert.rejects(()=>db.query("update public.ev_gap_reviews set note='bypass'"),{code:'42501'});await assert.rejects(()=>db.query('delete from public.ev_gap_reviews'),{code:'42501'});});
 await check('drafted status requires an accessible saved draft',async()=>{await assert.rejects(()=>save(2,1,'missing_content','drafted'),{code:'22023'});await assert.rejects(()=>save(2,1,'missing_content','drafted','Synthetic note',D),{code:'42501'});});
 await db.query("select public.ev_save_draft($1,$2,0,'Synthetic knowledge','A synthetic fact','Synthetic provenance','draft')",[D,uuid(20)]);
 await check('review can link an existing owner draft without publishing it',async()=>{assert.equal((await save(2,1,'missing_content','drafted','Source reviewed',D)).revision,2);assert.equal((await gaps())[0].draft_id,D);assert.equal((await db.query('select status from public.ev_knowledge_drafts where id=$1',[D])).rows[0].status,'draft');});
 await check('closed reviews remain inspectable and do not create new knowledge',async()=>{await save(3,2,'missing_content','closed','Source reviewed',D);assert.equal((await gaps())[0].status,'closed');assert.equal((await db.query('select count(*)::int n from public.ev_knowledge_drafts')).rows[0].n,1);});
 await check('invalid fields are rejected without consuming a revision',async()=>{await assert.rejects(()=>save(4,3,'guessed'),{code:'22023'});await assert.rejects(()=>save(4,3,'unclassified','new','x'.repeat(1001)),{code:'22023'});assert.equal((await gaps())[0].revision,3);});
 await check('review expiry matches its conversation instead of extending retention',async()=>{await role('postgres');assert.equal((await db.query('select g.expires_at=c.expires_at ok from public.ev_gap_reviews g join public.ev_messages m on m.id=g.message_id join public.ev_conversations c on c.id=m.conversation_id')).rows[0].ok,true);});
 await check('revoked owner cannot read or update a retained review',async()=>{await role('authenticated',O,'aal2');await db.exec('reset role');await db.query('delete from auth.sessions where user_id=$1',[O]);await db.exec('set role authenticated');await assert.rejects(gaps,{code:'42501'});await assert.rejects(()=>save(4,3),{code:'42501'});});
 await check('guest deletion cascades to the review while preserving the approved draft',async()=>{await role('authenticated');await db.query('delete from public.ev_conversations where id=$1',[C]);await role('postgres');assert.equal((await db.query('select count(*)::int n from public.ev_gap_reviews')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from public.ev_knowledge_drafts')).rows[0].n,1);});
 await db.query('insert into auth.sessions(id,user_id,aal) values($1,$1,$2)',[O,'aal2']);
 await check('a late retry cannot resurrect a deleted question or review',async()=>{await role('authenticated',O,'aal2');await assert.rejects(()=>save(3,2,'missing_content','closed','Source reviewed',D),{code:'42501'});assert.deepEqual(await gaps(),[]);});
 console.log(JSON.stringify({passed,failed:0}));
}finally{await db.close();}
