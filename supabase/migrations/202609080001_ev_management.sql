-- Additive candidate migration. Apply to disposable staging before live activation.
-- auth helpers and roles are supplied by Supabase; the local harness mocks only that boundary.
begin;
create schema if not exists ev_private;
revoke all on schema ev_private from public, anon, authenticated;
grant usage on schema ev_private to authenticated;

create table ev_private.owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table ev_private.owners enable row level security;
revoke all on ev_private.owners from public, anon, authenticated, service_role;

create function ev_private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt())->>'aal' = 'aal2', false)
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false'
    and exists (select 1 from ev_private.owners where user_id = (select auth.uid()) and enabled);
$$;
revoke all on function ev_private.is_owner() from public, anon, authenticated, service_role;
grant execute on function ev_private.is_owner() to authenticated;

create table public.ev_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null check (app in ('ev', 'cited')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  next_sequence integer not null default 1 check (next_sequence > 0),
  check (expires_at > created_at and expires_at <= created_at + interval '30 days')
);
create index ev_conversations_user_created on public.ev_conversations(user_id, created_at desc);
create index ev_conversations_expiry on public.ev_conversations(expires_at);

create table public.ev_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ev_conversations(id) on delete cascade,
  request_id uuid not null,
  sequence integer not null check (sequence > 0),
  role text not null check (role in ('user', 'assistant')),
  body text not null check (length(btrim(body)) between 1 and 12000),
  created_at timestamptz not null default now(),
  unique(conversation_id, sequence),
  unique(conversation_id, request_id, role)
);
create table public.ev_answer_events (
  message_id uuid primary key references public.ev_messages(id) on delete cascade,
  outcome text not null check(outcome in ('answered','missing_content','retrieval_miss','provider_failure','policy_boundary')),
  route text not null check(route in ('primary','fallback','none')),
  model text check(length(model) <= 100),
  retrieved text[] not null default '{}',
  cited text[] not null default '{}',
  latency_ms integer check(latency_ms between 0 and 600000),
  corpus_sha256 text not null check(corpus_sha256 ~ '^[a-f0-9]{64}$'),
  prompt_sha256 text not null check(prompt_sha256 ~ '^[a-f0-9]{64}$'),
  check(cardinality(retrieved) <= 20 and cardinality(cited) <= 20)
);
create table public.ev_feedback (
  message_id uuid primary key references public.ev_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  helpful boolean not null,
  updated_at timestamptz not null default now()
);
create table public.ev_knowledge_drafts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users(id),
  title text not null check(length(btrim(title)) between 1 and 160),
  body text not null check(length(btrim(body)) between 1 and 20000),
  provenance text not null check(length(btrim(provenance)) between 1 and 1000),
  status text not null default 'draft' check(status in ('draft','ready_for_review')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ev_gap_reviews (
  id uuid primary key default gen_random_uuid(),
  question_key text not null unique check(length(question_key) between 1 and 500),
  diagnosis text not null check(diagnosis in ('missing_content','retrieval_miss','provider_failure','policy_boundary')),
  status text not null check(status in ('new','investigating','drafted','closed')),
  note text not null default '' check(length(note) <= 1000),
  draft_id uuid references public.ev_knowledge_drafts(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz not null default now()
);
create table ev_private.retention_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  conversations_deleted integer not null,
  gap_reviews_deleted integer not null
);
alter table ev_private.retention_runs enable row level security;
revoke all on ev_private.retention_runs from public, anon, authenticated, service_role;

alter table public.ev_conversations enable row level security;
alter table public.ev_messages enable row level security;
alter table public.ev_answer_events enable row level security;
alter table public.ev_feedback enable row level security;
alter table public.ev_knowledge_drafts enable row level security;
alter table public.ev_gap_reviews enable row level security;
revoke all on public.ev_conversations, public.ev_messages, public.ev_answer_events,
  public.ev_feedback, public.ev_knowledge_drafts, public.ev_gap_reviews from public, anon, authenticated, service_role;
grant select, delete on public.ev_conversations to authenticated;
grant select on public.ev_messages, public.ev_answer_events, public.ev_feedback to authenticated;
grant select, delete on public.ev_knowledge_drafts, public.ev_gap_reviews to authenticated;
grant insert(title,body,provenance,status) on public.ev_knowledge_drafts to authenticated;
grant insert(question_key,diagnosis,status,note,draft_id) on public.ev_gap_reviews to authenticated;
grant update(title, body, provenance, status) on public.ev_knowledge_drafts to authenticated;
grant update(diagnosis, status, note, draft_id) on public.ev_gap_reviews to authenticated;

create policy ev_conversations_read on public.ev_conversations for select to authenticated
  using(expires_at > now() and (user_id = (select auth.uid()) or (select ev_private.is_owner())));
create policy ev_conversations_delete on public.ev_conversations for delete to authenticated
  using(user_id = (select auth.uid()));
create policy ev_messages_read on public.ev_messages for select to authenticated
  using(exists(select 1 from public.ev_conversations c where c.id = conversation_id));
create policy ev_events_read on public.ev_answer_events for select to authenticated
  using(exists(select 1 from public.ev_messages m where m.id = message_id));
create policy ev_feedback_read on public.ev_feedback for select to authenticated
  using(exists(select 1 from public.ev_messages m where m.id = message_id));
create policy ev_drafts_owner on public.ev_knowledge_drafts for all to authenticated
  using((select ev_private.is_owner())) with check((select ev_private.is_owner()) and author_id = (select auth.uid()));
create policy ev_gaps_owner on public.ev_gap_reviews for all to authenticated
  using(expires_at > now() and (select ev_private.is_owner())) with check((select ev_private.is_owner()) and expires_at <= now() + interval '30 days');

-- Server timestamps/revisions cannot be supplied by the editor.
create function ev_private.touch_editorial() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_table_name = 'ev_knowledge_drafts' then new.revision := old.revision + 1; end if;
  return new;
end; $$;
revoke all on function ev_private.touch_editorial() from public, anon, authenticated, service_role;
create trigger ev_draft_revision before update on public.ev_knowledge_drafts for each row execute function ev_private.touch_editorial();
create trigger ev_gap_timestamp before update on public.ev_gap_reviews for each row execute function ev_private.touch_editorial();

-- Lock the authenticated user's own auth row to bound concurrent conversation creation.
create function public.ev_create_conversation(p_id uuid, p_app text default 'ev') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_existing public.ev_conversations%rowtype;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from auth.users where id=v_user for update;
  if not found then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_existing from public.ev_conversations where id=p_id;
  if found then
    if v_existing.user_id <> v_user or v_existing.expires_at <= now() or v_existing.app <> p_app then
      raise exception 'Conversation unavailable' using errcode='42501';
    end if;
    return p_id;
  end if;
  if (select count(*) from public.ev_conversations where user_id=v_user and expires_at > now()) >= 12 then
    raise exception 'Conversation limit reached' using errcode='54000';
  end if;
  insert into public.ev_conversations(id,user_id,app) values(p_id,v_user,p_app);
  return p_id;
end; $$;

create function public.ev_append_user_message(p_conversation_id uuid, p_request_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_conversation public.ev_conversations%rowtype; v_message public.ev_messages%rowtype; v_id uuid;
begin
  select * into v_conversation from public.ev_conversations where id=p_conversation_id and user_id=auth.uid() and expires_at > now() for update;
  if not found then raise exception 'Conversation unavailable' using errcode='42501'; end if;
  select * into v_message from public.ev_messages where conversation_id=p_conversation_id and request_id=p_request_id and role='user';
  if found then
    if v_message.body <> p_body then raise exception 'Idempotency conflict' using errcode='22000'; end if;
    return v_message.id;
  end if;
  if (select count(*) from public.ev_messages where conversation_id=p_conversation_id and role='user') >= 80 then
    raise exception 'Conversation message limit reached' using errcode='54000';
  end if;
  insert into public.ev_messages(conversation_id,request_id,sequence,role,body)
    values(p_conversation_id,p_request_id,v_conversation.next_sequence,'user',p_body) returning id into v_id;
  update public.ev_conversations set next_sequence=next_sequence+1 where id=p_conversation_id;
  return v_id;
end; $$;

-- Called only by the trusted server after a response exists; it never dispatches a model.
create function public.ev_append_assistant_message(p_user_id uuid, p_conversation_id uuid, p_request_id uuid, p_body text,
  p_outcome text, p_route text, p_model text, p_retrieved text[], p_cited text[], p_latency_ms integer,
  p_corpus_sha256 text, p_prompt_sha256 text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_conversation public.ev_conversations%rowtype; v_message public.ev_messages%rowtype; v_event public.ev_answer_events%rowtype; v_id uuid;
begin
  select * into v_conversation from public.ev_conversations where id=p_conversation_id and user_id=p_user_id and expires_at > now() for update;
  if not found or not exists(select 1 from public.ev_messages where conversation_id=p_conversation_id and request_id=p_request_id and role='user') then
    raise exception 'Conversation unavailable' using errcode='42501';
  end if;
  select * into v_message from public.ev_messages where conversation_id=p_conversation_id and request_id=p_request_id and role='assistant';
  if found then
    select * into v_event from public.ev_answer_events where message_id=v_message.id;
    if v_message.body is distinct from p_body or
      row(v_event.outcome,v_event.route,v_event.model,v_event.retrieved,v_event.cited,v_event.latency_ms,v_event.corpus_sha256,v_event.prompt_sha256)
      is distinct from row(p_outcome,p_route,p_model,p_retrieved,p_cited,p_latency_ms,p_corpus_sha256,p_prompt_sha256) then
      raise exception 'Idempotency conflict' using errcode='22000';
    end if;
    return v_message.id;
  end if;
  insert into public.ev_messages(conversation_id,request_id,sequence,role,body)
    values(p_conversation_id,p_request_id,v_conversation.next_sequence,'assistant',p_body) returning id into v_id;
  insert into public.ev_answer_events(message_id,outcome,route,model,retrieved,cited,latency_ms,corpus_sha256,prompt_sha256)
    values(v_id,p_outcome,p_route,p_model,p_retrieved,p_cited,p_latency_ms,p_corpus_sha256,p_prompt_sha256);
  update public.ev_conversations set next_sequence=next_sequence+1 where id=p_conversation_id;
  return v_id;
end; $$;

create function public.ev_set_feedback(p_message_id uuid, p_helpful boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.ev_messages m join public.ev_conversations c on c.id=m.conversation_id
    where m.id=p_message_id and m.role='assistant' and c.user_id=auth.uid() and c.expires_at > now()) then
    raise exception 'Message unavailable' using errcode='42501';
  end if;
  insert into public.ev_feedback(message_id,user_id,helpful) values(p_message_id,auth.uid(),p_helpful)
    on conflict(message_id) do update set helpful=excluded.helpful, updated_at=now();
end; $$;

create function public.ev_purge_expired() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_conversations integer; v_gaps integer;
begin
  delete from public.ev_conversations where expires_at <= now(); get diagnostics v_conversations = row_count;
  delete from public.ev_gap_reviews where expires_at <= now(); get diagnostics v_gaps = row_count;
  insert into ev_private.retention_runs(conversations_deleted,gap_reviews_deleted) values(v_conversations,v_gaps);
  return v_conversations;
end; $$;

revoke all on function public.ev_create_conversation(uuid,text), public.ev_append_user_message(uuid,uuid,text),
  public.ev_set_feedback(uuid,boolean), public.ev_append_assistant_message(uuid,uuid,uuid,text,text,text,text,text[],text[],integer,text,text),
  public.ev_purge_expired() from public, anon, authenticated, service_role;
grant execute on function public.ev_create_conversation(uuid,text), public.ev_append_user_message(uuid,uuid,text), public.ev_set_feedback(uuid,boolean) to authenticated;
grant execute on function public.ev_append_assistant_message(uuid,uuid,uuid,text,text,text,text,text[],text[],integer,text,text), public.ev_purge_expired() to service_role;
commit;
