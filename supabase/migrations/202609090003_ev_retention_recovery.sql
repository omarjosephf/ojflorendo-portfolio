-- Bounded retention and deletion replay. Scheduling is a separate staging operation.
begin;
create table ev_private.deleted_conversations (
  conversation_id uuid primary key,
  deleted_at timestamptz not null default now()
);
create index ev_deleted_conversations_age on ev_private.deleted_conversations(deleted_at);
alter table ev_private.deleted_conversations enable row level security;
revoke all on ev_private.deleted_conversations from public, anon, authenticated, service_role;
alter table ev_private.retention_runs add column anonymous_users_deleted integer not null default 0;

create function ev_private.record_conversation_deletion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into ev_private.deleted_conversations(conversation_id) values(old.id)
    on conflict(conversation_id) do nothing;
  return old;
end; $$;
revoke all on function ev_private.record_conversation_deletion() from public, anon, authenticated, service_role;
create trigger ev_record_conversation_deletion after delete on public.ev_conversations
  for each row execute function ev_private.record_conversation_deletion();

-- SQL hiding is immediate at expiry. Physical deletion drains at most 1000 rows
-- of each kind per run; the hourly job and backlog monitoring must be qualified.
create or replace function public.ev_purge_expired() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_conversations integer; v_gaps integer;
begin
  with expired as (
    select id from public.ev_conversations where expires_at <= now()
      order by expires_at,id limit 1000 for update skip locked
  ) delete from public.ev_conversations where id in (select id from expired);
  get diagnostics v_conversations = row_count;
  with expired as (
    select id from public.ev_gap_reviews where expires_at <= now()
      order by expires_at,id limit 1000 for update skip locked
  ) delete from public.ev_gap_reviews where id in (select id from expired);
  get diagnostics v_gaps = row_count;
  insert into ev_private.retention_runs(conversations_deleted,gap_reviews_deleted)
    values(v_conversations,v_gaps);
  return v_conversations;
end; $$;

-- This private entrypoint is for the database scheduler/DB owner only. An account
-- remains while recently signed in, owning unexpired chats or holding owner status.
-- See Supabase's documented anonymous-user cleanup SQL. No Storage uploads exist.
create function ev_private.run_maintenance() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_conversations integer; v_users integer;
begin
  v_conversations := public.ev_purge_expired();
  with inactive as (
    select u.id from auth.users u
    where u.is_anonymous is true and u.created_at < now() - interval '30 days'
      and coalesce(u.last_sign_in_at,u.created_at) < now() - interval '30 days'
      and not exists(select 1 from public.ev_conversations c where c.user_id=u.id)
      and not exists(select 1 from ev_private.owners o where o.user_id=u.id)
      and not exists(select 1 from public.ev_knowledge_drafts d where d.author_id=u.id)
    order by u.created_at,u.id limit 1000 for update of u skip locked
  ) delete from auth.users where id in(select id from inactive);
  get diagnostics v_users = row_count;
  insert into ev_private.retention_runs(conversations_deleted,gap_reviews_deleted,anonymous_users_deleted)
    values(0,0,v_users);
  delete from ev_private.retention_runs where ran_at < now() - interval '90 days';
  -- Backups are permitted for at most seven days. 45 days leaves replay headroom;
  -- the latest deletion ledger must be merged before opening any restored data.
  delete from ev_private.deleted_conversations where deleted_at < now() - interval '45 days';
  return jsonb_build_object('conversations_deleted',v_conversations,'anonymous_users_deleted',v_users);
end; $$;
revoke all on function ev_private.run_maintenance() from public, anon, authenticated, service_role;

-- Run in an isolated restore, with API access disabled and latest tombstones
-- merged. Never restore auth.sessions/refresh tokens as part of application recovery.
create function ev_private.reconcile_restored_conversations() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_deleted integer;
begin
  delete from public.ev_conversations c where expires_at <= now()
    or exists(select 1 from ev_private.deleted_conversations d where d.conversation_id=c.id);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end; $$;
revoke all on function ev_private.reconcile_restored_conversations() from public, anon, authenticated, service_role;
commit;
