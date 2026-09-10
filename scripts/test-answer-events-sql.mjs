import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db=new PGlite();
const U="10000000-0000-4000-8000-000000000001",O="10000000-0000-4000-8000-000000000002",C="20000000-0000-4000-8000-000000000001";
const sha="a".repeat(64),request=n=>`30000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const event={version:1,outcome:"answered",route:"primary",model:"synthetic-model",retrieved:["project-cited.md"],cited:["project-cited.md"],latencyMs:123,corpusSha256:sha,promptSha256:sha};
const result={state:"answered",answer:"Synthetic grounded reply",modelRoute:"primary",citations:[{sourceId:"project-cited.md",evidenceId:sha,quote:"Synthetic",label:"Cited",href:null}]};
let passed=0;
async function check(label,fn){await fn();passed++;console.log(`PASS ${label}`);}
async function role(name,user=U,aal="aal1"){
 await db.exec("reset role");await db.query("update auth.sessions set aal=$1 where user_id=$2",[aal,user]);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,session_id:user,aal,is_anonymous:user===U})]);
 if(name!=="postgres")await db.exec(`set role ${name}`);
}
async function claim(n){await role("authenticated");await db.query("select public.ev_append_user_message($1,$2,'Synthetic question')",[C,request(n)]);await role("service_role");await db.query("select public.ev_claim_generation($1,$2,$3,$4)",[U,C,request(n),sha]);}
async function save(n,e=event,r=result){return (await db.query("select public.ev_complete_generation_event($1,$2,$3,$4,$5,$6) id",[U,C,request(n),sha,r,e])).rows[0].id;}
try{
 await db.exec(await readFile(new URL("../supabase/tests/auth-fixture.sql",import.meta.url),"utf8"));
 const root=new URL("../supabase/migrations/",import.meta.url);
 for(const name of (await readdir(root)).filter(n=>n.endsWith(".sql")).sort())await db.exec(await readFile(new URL(name,root),"utf8"));
 await db.query("insert into auth.users(id,is_anonymous) values($1,true),($2,false)",[U,O]);
 await db.exec("insert into auth.sessions(id,user_id) select id,id from auth.users");
 await db.query("insert into ev_private.owners(user_id) values($1)",[O]);
 await role("authenticated");await db.query("select public.ev_create_conversation($1,'ev')",[C]);
 await check("reply and trusted event are saved atomically",async()=>{await claim(1);const id=await save(1);await role("postgres");assert.equal((await db.query("select e.message_id from public.ev_answer_events e join public.ev_message_results r on r.message_id=e.message_id")).rows[0].message_id,id);});
 await check("same event retry returns the original message",async()=>{await role("service_role");assert.equal(await save(1),await save(1));});
 await check("changed event retry is rejected",async()=>{await assert.rejects(()=>save(1,{...event,latencyMs:124}),{code:"22000"});});
 await check("guests cannot inspect their own diagnostic events",async()=>{await role("authenticated");assert.equal((await db.query("select * from public.ev_answer_events")).rows.length,0);});
 await check("guests cannot forge events through the RPC",async()=>{await assert.rejects(()=>save(1),{code:"42501"});});
 await check("owner without MFA sees no events",async()=>{await role("authenticated",O);assert.equal((await db.query("select * from public.ev_answer_events")).rows.length,0);});
 await check("MFA owner can inspect events",async()=>{await role("authenticated",O,"aal2");assert.equal((await db.query("select * from public.ev_answer_events")).rows.length,1);});
 let n=2;
 for(const [label,bad] of [["wrong schema",{...event,extra:true}],["mismatched route",{...event,route:"fallback"}],["uncited source",{...event,cited:["unknown.md"]}],["missing runtime hash",{...event,promptSha256:null}],["invalid timing",{...event,latencyMs:-1}],["inferred diagnosis",{...event,outcome:"missing_content"}]]){
  const id=n++;await check(`${label} refuses without leaving a reply`,async()=>{await claim(id);await assert.rejects(()=>save(id,bad));await role("postgres");assert.equal((await db.query("select * from public.ev_messages where request_id=$1 and role='assistant'",[request(id)])).rows.length,0);});
 }
 await check("an unsupported reply remains unclassified",async()=>{await claim(20);await save(20,{...event,outcome:"not_covered",cited:[]},{state:"not-covered",answer:"Synthetic unsupported reply",modelRoute:"primary"});});
 await check("a failed event insertion rolls back response completion",async()=>{await claim(21);await role("postgres");await db.exec("create function public.synthetic_reject_event() returns trigger language plpgsql as $$ begin raise exception 'Synthetic failure'; end $$; create trigger synthetic_reject before insert on public.ev_answer_events for each row execute function public.synthetic_reject_event();");await role("service_role");await assert.rejects(()=>save(21));await role("postgres");assert.equal((await db.query("select result from ev_private.generation_requests where request_id=$1",[request(21)])).rows[0].result,null);await db.exec("drop trigger synthetic_reject on public.ev_answer_events; drop function public.synthetic_reject_event();");});
 await check("deletion removes events and forbids later save retries",async()=>{await role("authenticated");await db.query("delete from public.ev_conversations where id=$1",[C]);await role("postgres");assert.equal((await db.query("select * from public.ev_answer_events")).rows.length,0);await role("service_role");await assert.rejects(()=>save(1),{code:"42501"});});
 console.log(JSON.stringify({passed,failed:0}));
} finally {await db.close();}
