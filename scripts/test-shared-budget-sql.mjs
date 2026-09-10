import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
let passed = 0;
const checks = [];
const sha = (c) => c.repeat(64);
const baseService = (id) => ({
  ledger_id: sha(id), daily_attempts: 40, monthly_attempts: 200,
  daily_micro_usd: 400000, monthly_micro_usd: 2000000, lifetime_micro_usd: 3000000,
  carried_lifetime_micro_usd: 0, carried_day_micro_usd: 0, carried_month_micro_usd: 0,
});
const base = () => ({
  version: 1, reservation_micro_usd: 40000, aggregate_cap_micro_usd: 3000000,
  aggregate_carried_micro_usd: 0, max_active: 1,
  services: { ev: baseService("e"), cited: baseService("c") },
});
let serial = 0;
async function seed(policy = base(), enabled = true) {
  const id = (++serial).toString(16).padStart(64, "0");
  await db.query("insert into budget_private.pools(ledger_id,config_id,carry_forward_sha256,policy,enabled) values($1,$2,$3,$4,$5)", [id,sha("a"),sha("b"),policy,enabled]);
  return { id, policy };
}
const job = () => ({id:randomUUID(), owner:randomUUID()});
async function call(pool, j, action, service="ev", ordinal=0, override={}) {
  const p = {ledger:pool.id,config:sha("a"),carry:sha("b"),policy:pool.policy,service,
    job:j.id,owner:j.owner,maximum:2,action,ordinal,...override};
  return (await db.query("select public.ev_budget_admission($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result",
    [p.ledger,p.config,p.carry,p.policy,p.service,p.job,p.owner,p.maximum,p.action,p.ordinal])).rows[0].result;
}
async function check(name, fn) {
  try { await fn(); passed++; checks.push({name,passed:true}); console.log("PASS "+name); }
  catch(e) { checks.push({name,passed:false}); console.error("FAIL "+name); throw e; }
}
async function reject(fn) { await assert.rejects(fn); }
async function spend(pool, service="ev") {
  const j=job();
  assert.equal((await call(pool,j,"acquire",service)).status,"acquired");
  const r=await call(pool,j,"reserve",service,1);
  await call(pool,j,"release",service);
  return r;
}
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(await readFile(new URL("../supabase/migrations/202609090006_ev_shared_budget.sql",import.meta.url),"utf8"));
  await check("migration creates no real allowance",async()=>{
    assert.equal((await db.query("select count(*)::int n from budget_private.pools")).rows[0].n,0);
  });
  await check("private tables all enforce RLS",async()=>{
    const rows=(await db.query("select relrowsecurity from pg_class where relnamespace='budget_private'::regnamespace and relkind='r'")).rows;
    assert.equal(rows.length,3); assert.ok(rows.every(r=>r.relrowsecurity));
  });
  for(const role of ["anon","authenticated","service_role"]) {
    await check(role+" cannot read or mutate ledger tables",async()=>{
      await db.exec("set role "+role);
      try { await reject(()=>db.query("select * from budget_private.pools")); await reject(()=>db.query("delete from budget_private.jobs")); }
      finally { await db.exec("reset role"); }
    });
  }
  for(const role of ["anon","authenticated"]) {
    await check(role+" cannot execute admission RPC",async()=>{
      await db.exec("set role "+role);
      try { await reject(()=>call({id:sha("a"),policy:base()},job(),"acquire")); }
      finally { await db.exec("reset role"); }
    });
  }
  await check("service role can use only provisioned RPC identity",async()=>{
    const p=await seed(); await db.exec("set role service_role");
    try { assert.equal((await call(p,job(),"inspect")).remaining,10); }
    finally { await db.exec("reset role"); }
  });
  for(const key of Object.keys(base())) {
    await check("missing policy "+key+" rejected",async()=>{
      const p=base(); delete p[key]; await reject(()=>seed(p));
    });
  }
  for(const key of Object.keys(baseService("e"))) {
    await check("missing service "+key+" rejected",async()=>{
      const p=base(); delete p.services.ev[key]; await reject(()=>seed(p));
    });
  }
  for(const [name,edit] of [
    ["lower reservation",p=>p.reservation_micro_usd=39999],
    ["string money",p=>p.aggregate_cap_micro_usd="3000000"],
    ["boolean version",p=>p.version=true],
    ["raised service limit",p=>p.services.ev.daily_micro_usd=440000],
    ["raised aggregate cap",p=>p.aggregate_cap_micro_usd=3040000],
    ["same service identity",p=>p.services.ev.ledger_id=p.services.cited.ledger_id],
    ["extra policy field",p=>p.bootstrap=true],
    ["negative carried amount",p=>p.aggregate_carried_micro_usd=-1],
  ]) {
    await check(name+" rejected",async()=>{const p=base();edit(p);await reject(()=>seed(p));});
  }
  await check("missing and disabled pools fail closed",async()=>{
    await reject(()=>call({id:sha("f"),policy:base()},job(),"acquire"));
    await reject(async()=>call(await seed(base(),false),job(),"acquire"));
  });
  await check("all binding mismatches fail closed",async()=>{
    const p=await seed();
    for(const override of [{config:sha("f")},{carry:sha("f")},{policy:{...p.policy,max_active:2}}])
      await reject(()=>call(p,job(),"acquire","ev",0,override));
  });
  await check("aggregate worker bound spans both services; no lease expiry",async()=>{
    const p=await seed(),a=job(),b=job();
    assert.equal((await call(p,a,"acquire")).status,"acquired");
    await db.query("update budget_private.jobs set opened_at=opened_at-interval '7 days' where ledger_id=$1",[p.id]);
    assert.equal((await call(p,b,"acquire","cited")).status,"busy");
    await call(p,a,"release");
    assert.equal((await call(p,b,"acquire","cited")).status,"acquired");
  });
  await check("duplicate acquisition and reservation never grant replay",async()=>{
    const p=await seed(),j=job();
    await call(p,j,"acquire"); assert.equal((await call(p,j,"acquire")).status,"duplicate");
    assert.equal((await call(p,j,"reserve","ev",1)).status,"reserved");
    assert.equal((await call(p,j,"reserve","ev",1)).status,"duplicate");
    assert.equal((await call(p,j,"inspect")).used,1);
  });
  await check("two serial attempts; finished jobs cannot reserve",async()=>{
    const p=await seed(),j=job();await call(p,j,"acquire");
    assert.equal((await call(p,j,"reserve","ev",2)).status,"exhausted");
    await call(p,j,"reserve","ev",1);await call(p,j,"reserve","ev",2);
    await call(p,j,"release");assert.equal((await call(p,j,"reserve","ev",2)).status,"closed");
    assert.equal((await call(p,j,"acquire")).status,"duplicate");
  });
  await check("wrong worker, service or maximum cannot release or reserve",async()=>{
    const p=await seed(),j=job();await call(p,j,"acquire");
    for(const override of [{owner:randomUUID()},{service:"cited"},{maximum:1}])
      for(const action of ["release","reserve"]) await reject(()=>call(p,j,action,"ev",1,override));
  });
  await check("both services exhaust one nonrenewing aggregate",async()=>{
    const policy=base();policy.aggregate_cap_micro_usd=80000;
    const p=await seed(policy);
    assert.equal((await spend(p,"ev")).status,"reserved");
    assert.equal((await spend(p,"cited")).status,"reserved");
    assert.equal((await call(p,job(),"acquire")).status,"exhausted");
  });
  await check("daily service money bound and independent service capacity",async()=>{
    const p=await seed();
    for(let n=0;n<10;n++) assert.equal((await spend(p)).status,"reserved");
    assert.equal((await call(p,job(),"acquire")).status,"exhausted");
    assert.equal((await spend(p,"cited")).status,"reserved");
  });
  await check("service lifetime cap survives day/month rollover",async()=>{
    const policy=base();policy.services.ev.lifetime_micro_usd=40000;
    const p=await seed(policy);await spend(p);
    await db.query("update budget_private.pools set opened_at=opened_at-interval '40 days' where ledger_id=$1",[p.id]);
    await db.query("update budget_private.reservations set reserved_at=reserved_at-interval '39 days' where ledger_id=$1",[p.id]);
    assert.equal((await call(p,job(),"acquire")).status,"exhausted");
    assert.equal((await spend(p,"cited")).status,"reserved");
  });
  await check("aggregate cap survives rollover",async()=>{
    const policy=base();policy.aggregate_cap_micro_usd=40000;
    const p=await seed(policy);await spend(p);
    await db.query("update budget_private.pools set opened_at=opened_at-interval '40 days' where ledger_id=$1",[p.id]);
    await db.query("update budget_private.reservations set reserved_at=reserved_at-interval '39 days' where ledger_id=$1",[p.id]);
    assert.equal((await call(p,job(),"acquire","cited")).status,"exhausted");
  });
  await check("carry-forward rounds service attempts up and never refunds",async()=>{
    const policy=base();
    Object.assign(policy.services.ev,{carried_day_micro_usd:360001,carried_month_micro_usd:360001,carried_lifetime_micro_usd:360001});
    const p=await seed(policy);assert.equal((await call(p,job(),"inspect")).remaining,0);
    policy.aggregate_carried_micro_usd=3000000;
    const exhausted=await seed(policy);assert.equal((await call(exhausted,job(),"inspect","cited")).remaining,0);
  });
  await check("aggregate carry-forward is independent of prior service pilot",async()=>{
    const policy=base();policy.aggregate_cap_micro_usd=80000;policy.aggregate_carried_micro_usd=40001;
    const p=await seed(policy);assert.equal((await call(p,job(),"inspect")).remaining,0);
  });
  await check("counter corruption and missing reservations fail closed",async()=>{
    const p=await seed();await spend(p);
    await db.query("delete from budget_private.reservations where ledger_id=$1",[p.id]);
    await reject(()=>call(p,job(),"inspect"));
  });
  await check("clock regression fails closed",async()=>{
    const p=await seed();await db.query("update budget_private.pools set last_seen=clock_timestamp()+interval '1 day' where ledger_id=$1",[p.id]);
    await reject(()=>call(p,job(),"inspect"));
  });
  await check("reservation and counter roll back in one transaction",async()=>{
    const p=await seed(),j=job();await call(p,j,"acquire");
    await db.exec("begin");await call(p,j,"reserve","ev",1);await db.exec("rollback");
    assert.equal((await call(p,j,"inspect")).used,0);
    assert.equal((await call(p,j,"reserve","ev",1)).status,"reserved");
  });
  await check("lost committed response keeps reservation and occupancy",async()=>{
    const p=await seed(),j=job();await call(p,j,"acquire");
    await call(p,j,"reserve","ev",1); // Deliberately discard acknowledgment.
    assert.equal((await call(p,j,"reserve","ev",1)).status,"duplicate");
    assert.equal((await call(p,job(),"acquire","cited")).status,"busy");
    await call(p,j,"release");assert.equal((await call(p,j,"inspect")).used,1);
  });
  await check("bounded job history cannot grow beyond 10000",async()=>{
    const p=await seed();
    await db.query("insert into budget_private.jobs(ledger_id,job_id,owner_id,service,maximum,finished_at) select $1,gen_random_uuid(),gen_random_uuid(),'ev',2,clock_timestamp() from generate_series(1,10000)",[p.id]);
    assert.equal((await call(p,job(),"acquire")).status,"exhausted");
  });
  console.log(JSON.stringify({passed,failed:0,scope:"local PostgreSQL semantics; concurrent sessions qualified separately",checks}));
} finally { await db.close(); }
