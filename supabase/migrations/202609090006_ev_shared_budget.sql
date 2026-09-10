-- Shared qualification admission only. No allowance is seeded or activated.
begin;
create schema budget_private;
revoke all on schema budget_private from public, anon, authenticated, service_role;

create function budget_private.valid_policy(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare s jsonb; k text; n bigint;
begin
  if p is null or jsonb_typeof(p) <> 'object'
     or p - array['version','reservation_micro_usd','aggregate_cap_micro_usd',
       'aggregate_carried_micro_usd','max_active','services'] <> '{}'::jsonb
     or p->'version' is distinct from '1'::jsonb or p->'reservation_micro_usd' is distinct from '40000'::jsonb
     or jsonb_typeof(p->'services') is distinct from 'object'
     or not (p->'services' ?& array['ev','cited'])
     or (p->'services') - array['ev','cited'] <> '{}'::jsonb then return false; end if;
  foreach k in array array['aggregate_cap_micro_usd','aggregate_carried_micro_usd','max_active'] loop
    if jsonb_typeof(p->k) is distinct from 'number' or (p->>k) !~ '^[0-9]{1,10}$'
      then return false; end if;
  end loop;
  if (p->>'aggregate_cap_micro_usd')::bigint not between 40000 and 3000000
     or (p->>'aggregate_carried_micro_usd')::bigint > 1000000000
     or (p->>'max_active')::int not between 1 and 4 then return false; end if;
  for s in select value from jsonb_each(p->'services') loop
    if jsonb_typeof(s) <> 'object' or s - array['ledger_id','daily_attempts',
      'monthly_attempts','daily_micro_usd','monthly_micro_usd','lifetime_micro_usd',
      'carried_lifetime_micro_usd','carried_day_micro_usd','carried_month_micro_usd'] <> '{}'::jsonb
      or (s->>'ledger_id') is null or (s->>'ledger_id') !~ '^[a-f0-9]{64}$'
      then return false; end if;
    foreach k in array array['daily_attempts','monthly_attempts','daily_micro_usd',
      'monthly_micro_usd','lifetime_micro_usd','carried_lifetime_micro_usd',
      'carried_day_micro_usd','carried_month_micro_usd'] loop
      if jsonb_typeof(s->k) is distinct from 'number' or (s->>k) !~ '^[0-9]{1,10}$'
        then return false; end if;
      n := (s->>k)::bigint;
      if n > 1000000000 then return false; end if;
    end loop;
    if (s->>'daily_attempts')::int not between 1 and 40
       or (s->>'monthly_attempts')::int not between 1 and 200
       or (s->>'daily_attempts')::int > (s->>'monthly_attempts')::int
       or (s->>'daily_micro_usd')::bigint not between 40000 and 400000
       or (s->>'monthly_micro_usd')::bigint not between 40000 and 2000000
       or (s->>'daily_micro_usd')::bigint > (s->>'monthly_micro_usd')::bigint
       or (s->>'lifetime_micro_usd')::bigint not between 40000 and 3000000
       or (s->>'carried_day_micro_usd')::bigint > (s->>'carried_month_micro_usd')::bigint
       or (s->>'carried_month_micro_usd')::bigint > (s->>'carried_lifetime_micro_usd')::bigint
       then return false; end if;
  end loop;
  return (p#>>'{services,ev,ledger_id}') <> (p#>>'{services,cited,ledger_id}');
exception when others then return false;
end $$;

create table budget_private.pools (
  ledger_id text primary key check (ledger_id ~ '^[a-f0-9]{64}$'),
  config_id text not null check (config_id ~ '^[a-f0-9]{64}$'),
  carry_forward_sha256 text not null check (carry_forward_sha256 ~ '^[a-f0-9]{64}$'),
  policy jsonb not null check (budget_private.valid_policy(policy)),
  enabled boolean not null default false,
  opened_at timestamptz not null default clock_timestamp(),
  last_seen timestamptz not null default clock_timestamp(),
  accounted_attempts bigint not null default 0 check (accounted_attempts >= 0)
);
create table budget_private.jobs (
  ledger_id text not null references budget_private.pools,
  job_id uuid not null,
  owner_id uuid not null,
  service text not null check (service in ('ev','cited')),
  maximum integer not null check (maximum between 1 and 2),
  opened_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  primary key (ledger_id,job_id)
);
create table budget_private.reservations (
  ledger_id text not null,
  job_id uuid not null,
  ordinal integer not null check (ordinal between 1 and 2),
  micro_usd integer not null check (micro_usd = 40000),
  reserved_at timestamptz not null default clock_timestamp(),
  primary key (ledger_id,job_id,ordinal),
  foreign key (ledger_id,job_id) references budget_private.jobs
);
create index budget_jobs_active on budget_private.jobs(ledger_id) where finished_at is null;
alter table budget_private.pools enable row level security;
alter table budget_private.jobs enable row level security;
alter table budget_private.reservations enable row level security;
revoke all on all tables in schema budget_private from public, anon, authenticated, service_role;
revoke all on function budget_private.valid_policy(jsonb) from public, anon, authenticated, service_role;

-- One short transaction locks the aggregate before observing any service total.
-- Worker occupancy is a durable row, NOT the SQL lock (which ends at commit).
create function public.ev_budget_admission(
  p_ledger_id text, p_config_id text, p_carry_forward_sha256 text, p_policy jsonb,
  p_service text, p_job_id uuid, p_owner_id uuid, p_maximum integer,
  p_action text, p_ordinal integer
) returns jsonb language plpgsql volatile security definer set search_path = ''
set lock_timeout = '1500ms' set statement_timeout = '2500ms' as $$
declare
  pool budget_private.pools%rowtype; job budget_private.jobs%rowtype;
  spec jsonb; stamp timestamptz; day_start timestamptz; month_start timestamptz;
  total_n bigint; service_n bigint; day_n bigint; month_n bigint; job_n bigint;
  active_n bigint; jobs_n bigint; remaining_n bigint; carry_day bigint; carry_month bigint;
  status text := 'ok'; job_found boolean;
begin
  if p_ledger_id is null or p_config_id is null or p_carry_forward_sha256 is null
    or p_policy is null or p_service is null or p_service not in ('ev','cited')
    or p_job_id is null or p_owner_id is null or p_maximum is null
    or p_maximum not between 1 and 2 or p_action is null
    or p_action not in ('inspect','acquire','reserve','release')
    or p_ordinal is null or p_ordinal not between 0 and 2 then
    raise exception using errcode='22023', message='budget_invalid_request';
  end if;
  select * into pool from budget_private.pools where ledger_id=p_ledger_id for update;
  if not found or not pool.enabled or pool.config_id <> p_config_id
    or pool.carry_forward_sha256 <> p_carry_forward_sha256
    or pool.policy <> p_policy or not budget_private.valid_policy(pool.policy) then
    raise exception using errcode='55000', message='budget_identity_or_config';
  end if;
  stamp := clock_timestamp();
  if stamp < pool.last_seen or pool.opened_at > stamp then
    raise exception using errcode='55000', message='budget_clock_regressed';
  end if;
  day_start := date_trunc('day',stamp at time zone 'UTC') at time zone 'UTC';
  month_start := date_trunc('month',stamp at time zone 'UTC') at time zone 'UTC';
  spec := pool.policy->'services'->p_service;
  select count(*),count(*) filter(where j.service=p_service),
    count(*) filter(where j.service=p_service and r.reserved_at >= day_start),
    count(*) filter(where j.service=p_service and r.reserved_at >= month_start)
    into total_n,service_n,day_n,month_n
    from budget_private.reservations r join budget_private.jobs j
      on j.ledger_id=r.ledger_id and j.job_id=r.job_id where r.ledger_id=p_ledger_id;
  if total_n <> pool.accounted_attempts or exists (
    select 1 from budget_private.reservations where ledger_id=p_ledger_id
      and (reserved_at > stamp or reserved_at < pool.opened_at)
  ) then raise exception using errcode='55000', message='budget_accounting'; end if;
  carry_day := case when pool.opened_at >= day_start then
    ((spec->>'carried_day_micro_usd')::bigint+39999)/40000 else 0 end;
  carry_month := case when pool.opened_at >= month_start then
    ((spec->>'carried_month_micro_usd')::bigint+39999)/40000 else 0 end;
  remaining_n := greatest(0,least(
    ((pool.policy->>'aggregate_cap_micro_usd')::bigint
      -(pool.policy->>'aggregate_carried_micro_usd')::bigint)/40000-total_n,
    ((spec->>'lifetime_micro_usd')::bigint
      -(spec->>'carried_lifetime_micro_usd')::bigint)/40000-service_n,
    (spec->>'daily_attempts')::bigint-day_n-carry_day,
    (spec->>'monthly_attempts')::bigint-month_n-carry_month,
    (spec->>'daily_micro_usd')::bigint/40000-day_n-carry_day,
    (spec->>'monthly_micro_usd')::bigint/40000-month_n-carry_month
  ));
  select * into job from budget_private.jobs
    where ledger_id=p_ledger_id and job_id=p_job_id;
  job_found := found;
  if p_action = 'acquire' then
    select count(*),count(*) filter(where finished_at is null) into jobs_n,active_n
      from budget_private.jobs where ledger_id=p_ledger_id;
    if job_found then status := 'duplicate';
    elsif remaining_n < 1 or jobs_n >= 10000 then status := 'exhausted';
    elsif active_n >= (pool.policy->>'max_active')::int then status := 'busy';
    else
      insert into budget_private.jobs(ledger_id,job_id,owner_id,service,maximum,opened_at)
        values(p_ledger_id,p_job_id,p_owner_id,p_service,p_maximum,stamp);
      status := 'acquired';
    end if;
  elsif p_action in ('reserve','release') then
    if not job_found or job.owner_id <> p_owner_id or job.service <> p_service
      or job.maximum <> p_maximum then
      raise exception using errcode='55000',message='budget_job_identity';
    end if;
    select count(*) into job_n from budget_private.reservations
      where ledger_id=p_ledger_id and job_id=p_job_id;
    if p_action='release' then
      update budget_private.jobs set finished_at=coalesce(finished_at,stamp)
        where ledger_id=p_ledger_id and job_id=p_job_id;
      status := 'released';
    elsif job.finished_at is not null then status := 'closed';
    elsif p_ordinal <= job_n then status := 'duplicate';
    elsif p_ordinal <> job_n+1 or p_ordinal > job.maximum then status := 'exhausted';
    elsif remaining_n < 1 or jobs_n >= 10000 then status := 'exhausted';
    else
      insert into budget_private.reservations values(p_ledger_id,p_job_id,p_ordinal,40000,stamp);
      update budget_private.pools set accounted_attempts=accounted_attempts+1
        where ledger_id=p_ledger_id;
      total_n := total_n+1; service_n := service_n+1; remaining_n := remaining_n-1;
      status := 'reserved';
    end if;
  end if;
  update budget_private.pools set last_seen=stamp where ledger_id=p_ledger_id;
  return jsonb_build_object('status',status,'ledger_id',p_ledger_id,'config_id',p_config_id,
    'job_id',p_job_id,'owner_id',p_owner_id,'ordinal',p_ordinal,
    'used',service_n,'remaining',remaining_n);
end $$;
revoke all on function public.ev_budget_admission(text,text,text,jsonb,text,uuid,uuid,integer,text,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.ev_budget_admission(text,text,text,jsonb,text,uuid,uuid,integer,text,integer)
  to service_role;
comment on function public.ev_budget_admission(text,text,text,jsonb,text,uuid,uuid,integer,text,integer)
  is 'Inactive until explicit ledger provisioning; no refunds, retry grants, expiry, or reset.';
commit;
