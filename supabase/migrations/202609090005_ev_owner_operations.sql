-- Owner-only draft writes and bounded reporting. No publication or model dispatch.
begin;
create table ev_private.editorial_receipts (
  request_id uuid primary key,
  actor_id uuid not null references auth.users(id),
  draft_id uuid not null references public.ev_knowledge_drafts(id) on delete cascade,
  input_sha256 text not null check(input_sha256 ~ '^[a-f0-9]{64}$'),
  revision integer not null,
  status text not null,
  saved_at timestamptz not null default now()
);
alter table ev_private.editorial_receipts enable row level security;
revoke all on ev_private.editorial_receipts from public, anon, authenticated, service_role;

-- All API writes now use checked revisions and an idempotency receipt.
revoke insert, update, delete on public.ev_knowledge_drafts from authenticated;
revoke insert(title,body,provenance,status), update(title,body,provenance,status)
  on public.ev_knowledge_drafts from authenticated;
create function public.ev_save_draft(p_id uuid,p_request_id uuid,p_expected_revision integer,
  p_title text,p_body text,p_provenance text,p_status text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_draft public.ev_knowledge_drafts%rowtype;
  v_receipt ev_private.editorial_receipts%rowtype; v_hash text;
begin
  if not ev_private.is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  if p_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision<0
    or p_title is null or length(btrim(p_title)) not between 1 and 160
    or p_body is null or length(btrim(p_body)) not between 1 and 20000
    or p_provenance is null or length(btrim(p_provenance)) not between 1 and 1000
    or p_status is null or p_status not in ('draft','ready_for_review')
  then raise exception 'Invalid draft' using errcode='22023'; end if;
  -- Serialize this owner's edits and capacity checks, including competing creates.
  perform 1 from ev_private.owners where user_id=v_user and enabled for update;
  v_hash:=encode(sha256(convert_to(jsonb_build_array(p_id,p_expected_revision,p_title,p_body,p_provenance,p_status)::text,'UTF8')),'hex');
  select * into v_receipt from ev_private.editorial_receipts where request_id=p_request_id;
  if found then
    if v_receipt.actor_id<>v_user or v_receipt.input_sha256<>v_hash then
      raise exception 'Save request conflict' using errcode='PT409';
    end if;
    return jsonb_build_object('id',v_receipt.draft_id,'revision',v_receipt.revision);
  end if;
  if (select count(*) from ev_private.editorial_receipts where actor_id=v_user)>=10000 then
    raise exception 'Editorial capacity reached' using errcode='PT429';
  end if;
  select * into v_draft from public.ev_knowledge_drafts where id=p_id for update;
  if found then
    if v_draft.author_id<>v_user then raise exception 'Draft unavailable' using errcode='42501'; end if;
    if v_draft.revision<>p_expected_revision then raise exception 'Draft changed' using errcode='PT409'; end if;
    update public.ev_knowledge_drafts set title=p_title,body=p_body,provenance=p_provenance,status=p_status
      where id=p_id returning * into v_draft;
  else
    if p_expected_revision<>0 then raise exception 'Draft changed' using errcode='PT409'; end if;
    if (select count(*) from public.ev_knowledge_drafts where author_id=v_user)>=100 then
      raise exception 'Draft capacity reached' using errcode='PT429';
    end if;
    insert into public.ev_knowledge_drafts(id,author_id,title,body,provenance,status)
      values(p_id,v_user,p_title,p_body,p_provenance,p_status) returning * into v_draft;
  end if;
  insert into ev_private.editorial_receipts(request_id,actor_id,draft_id,input_sha256,revision,status)
    values(p_request_id,v_user,p_id,v_hash,v_draft.revision,v_draft.status);
  return jsonb_build_object('id',p_id,'revision',v_draft.revision);
end; $$;
revoke all on function public.ev_save_draft(uuid,uuid,integer,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.ev_save_draft(uuid,uuid,integer,text,text,text,text) to authenticated;

create function public.ev_draft_history(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not ev_private.is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
    select revision,status,saved_at,actor_id,input_sha256 from ev_private.editorial_receipts
      where draft_id=p_id order by revision desc limit 20
  ) r);
end; $$;
revoke all on function public.ev_draft_history(uuid) from public,anon,authenticated,service_role;
grant execute on function public.ev_draft_history(uuid) to authenticated;

create index ev_messages_recent_questions on public.ev_messages(created_at desc,id desc) where role='user';
create function public.ev_owner_report(p_days integer default 7) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not ev_private.is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  if p_days is null or p_days not in (7,30) then raise exception 'Invalid window' using errcode='22023'; end if;
  with candidates as materialized (
    select m.id,m.conversation_id,m.request_id,m.body,m.created_at
      from public.ev_messages m join public.ev_conversations c on c.id=m.conversation_id
      where c.app='ev' and c.expires_at>now() and m.role='user'
        and m.created_at>=now()-make_interval(days=>p_days) and m.created_at<=now()
      order by m.created_at desc,m.id desc limit 1001
  ), questions as materialized (
    select * from candidates order by created_at desc,id desc limit 1000
  ), turns as materialized (
    select q.*,a.id answer_id,e.message_id event_id,e.outcome,e.cited,e.retrieved,f.helpful
      from questions q
      left join public.ev_messages a on a.conversation_id=q.conversation_id and a.request_id=q.request_id and a.role='assistant'
      left join public.ev_answer_events e on e.message_id=a.id
      left join public.ev_feedback f on f.message_id=a.id
  ), repeated as (
    select regexp_replace(lower(btrim(body)),'\s+',' ','g') question,count(*)::integer count
      from questions group by 1 order by count(*) desc,1 limit 20
  ), source_counts as (
    select source,count(distinct answer_id)::integer citations from turns
      cross join lateral unnest(cited) source group by source order by count(distinct answer_id) desc,source limit 20
  )
  select jsonb_build_object(
    'days',p_days,'asOf',now(),'from',now()-make_interval(days=>p_days),
    'truncated',(select count(*)>1000 from candidates),
    'questions',(select count(*) from questions),
    'conversations',(select count(distinct conversation_id) from questions),
    'replies',(select count(answer_id) from turns),
    'events',(select count(event_id) from turns),
    'feedback',(select count(helpful) from turns),
    'helpful',(select count(*) from turns where helpful is true),
    'topQuestions',(select coalesce(jsonb_agg(jsonb_build_object('question',left(question,500),'shortened',length(question)>500,'count',count)),'[]') from repeated),
    'sources',(select coalesce(jsonb_agg(jsonb_build_object('source',left(source,300),'citations',citations)),'[]') from source_counts),
    'outcomes',(select coalesce(jsonb_object_agg(outcome,n),'{}') from (select outcome,count(*) n from turns where event_id is not null group by outcome) o)
  ) into result;
  return result;
end; $$;
revoke all on function public.ev_owner_report(integer) from public,anon,authenticated,service_role;
grant execute on function public.ev_owner_report(integer) to authenticated;
commit;

