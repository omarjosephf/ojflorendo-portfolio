-- Human triage is attached to the retained reply; deletion removes the review.
begin;
alter table public.ev_gap_reviews add column message_id uuid unique references public.ev_messages(id) on delete cascade;
alter table public.ev_gap_reviews add column revision integer not null default 0 check(revision>=0);
alter table public.ev_gap_reviews add column last_request_id uuid;
alter table public.ev_gap_reviews add column last_input_sha256 text check(last_input_sha256 ~ '^[a-f0-9]{64}$');
alter table public.ev_gap_reviews drop constraint ev_gap_reviews_diagnosis_check;
alter table public.ev_gap_reviews add constraint ev_gap_reviews_diagnosis_check
  check(diagnosis in ('unclassified','missing_content','retrieval_miss','provider_failure','policy_boundary'));
revoke insert,update,delete on public.ev_gap_reviews from authenticated;
revoke insert(question_key,diagnosis,status,note,draft_id),update(diagnosis,status,note,draft_id) on public.ev_gap_reviews from authenticated;

create function public.ev_owner_gaps() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
  if not ev_private.is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select a.id message_id,a.conversation_id,a.created_at,
      left(q.body,500) question,length(q.body)>500 question_shortened,
      left(a.body,1500) answer,length(a.body)>1500 answer_shortened,
      case when f.helpful=false then 'negative_feedback'
        when e.outcome is not null then e.outcome
        else coalesce(r.payload->>'state','unknown') end observed,
      coalesce(e.retrieved,'{}'::text[]) retrieved,coalesce(e.cited,'{}'::text[]) cited,
      coalesce(g.diagnosis,'unclassified') diagnosis,coalesce(g.status,'new') status,
      coalesce(g.note,'') note,g.draft_id,coalesce(g.revision,0) revision
    from public.ev_messages a
    join public.ev_conversations c on c.id=a.conversation_id and c.app='ev' and c.expires_at>now()
    join public.ev_messages q on q.conversation_id=a.conversation_id and q.request_id=a.request_id and q.role='user'
    left join public.ev_message_results r on r.message_id=a.id
    left join public.ev_answer_events e on e.message_id=a.id
    left join public.ev_feedback f on f.message_id=a.id
    left join public.ev_gap_reviews g on g.message_id=a.id and g.expires_at>now()
    where a.role='assistant' and (f.helpful=false or (e.outcome is not null and e.outcome<>'answered') or r.payload->>'state' in ('not-covered','unavailable'))
    order by a.created_at desc,a.id desc limit 100
  ) t);
end; $$;

create function public.ev_review_gap(p_message_id uuid,p_request_id uuid,p_expected_revision integer,p_diagnosis text,p_status text,p_note text,p_draft_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_conversation public.ev_conversations%rowtype; v_review public.ev_gap_reviews%rowtype; v_hash text;
begin
  if not ev_private.is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  if p_message_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=2147483647
    or coalesce(p_diagnosis,'') not in ('unclassified','missing_content','retrieval_miss','provider_failure','policy_boundary')
    or coalesce(p_status,'') not in ('new','investigating','drafted','closed') or p_note is null or length(p_note)>1000
    or (p_status='drafted' and p_draft_id is null)
  then raise exception 'Invalid gap review' using errcode='22023'; end if;
  -- Serialize with deletion, retention and competing review writes.
  select c.* into v_conversation from public.ev_conversations c
    join public.ev_messages m on m.conversation_id=c.id
    where m.id=p_message_id and m.role='assistant' and c.app='ev' and c.expires_at>now() for update of c;
  if not found then raise exception 'Reply unavailable' using errcode='42501'; end if;
  if p_draft_id is not null then
    perform 1 from public.ev_knowledge_drafts where id=p_draft_id and author_id=auth.uid() for key share;
    if not found then raise exception 'Draft unavailable' using errcode='42501'; end if;
  end if;
  v_hash:=encode(sha256(convert_to(jsonb_build_array(p_message_id,p_expected_revision,p_diagnosis,p_status,p_note,p_draft_id)::text,'UTF8')),'hex');
  select * into v_review from public.ev_gap_reviews where message_id=p_message_id for update;
  if found then
    if v_review.last_request_id=p_request_id then
      if v_review.last_input_sha256 is distinct from v_hash then raise exception 'Review request conflict' using errcode='PT409'; end if;
      return jsonb_build_object('messageId',p_message_id,'revision',v_review.revision);
    end if;
    if v_review.revision<>p_expected_revision then raise exception 'Review changed' using errcode='PT409'; end if;
    update public.ev_gap_reviews set diagnosis=p_diagnosis,status=p_status,note=p_note,draft_id=p_draft_id,
      revision=revision+1,last_request_id=p_request_id,last_input_sha256=v_hash,expires_at=v_conversation.expires_at
      where id=v_review.id returning * into v_review;
  else
    if p_expected_revision<>0 then raise exception 'Review changed' using errcode='PT409'; end if;
    insert into public.ev_gap_reviews(question_key,message_id,diagnosis,status,note,draft_id,revision,last_request_id,last_input_sha256,expires_at)
      values('message:'||p_message_id::text,p_message_id,p_diagnosis,p_status,p_note,p_draft_id,1,p_request_id,v_hash,v_conversation.expires_at) returning * into v_review;
  end if;
  return jsonb_build_object('messageId',p_message_id,'revision',v_review.revision);
end; $$;
revoke all on function public.ev_owner_gaps(),public.ev_review_gap(uuid,uuid,integer,text,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ev_owner_gaps(),public.ev_review_gap(uuid,uuid,integer,text,text,text,uuid) to authenticated;
-- Retention receipts include reviews removed by conversation cascades.
-- At most 1000 conversations (and their bounded descendants), plus 1000
-- independently expired/legacy reviews, are removed per call.
create or replace function public.ev_purge_expired() returns integer
language plpgsql security definer set search_path='' as $$
declare v_ids uuid[]; v_conversations integer; v_cascaded integer; v_gaps integer;
begin
  select coalesce(array_agg(id),'{}'::uuid[]) into v_ids from (
    select id from public.ev_conversations where expires_at<=now()
      order by expires_at,id limit 1000 for update skip locked
  ) expired;
  select count(*)::integer into v_cascaded from (
    select g.id from public.ev_gap_reviews g join public.ev_messages m on m.id=g.message_id
      where m.conversation_id=any(v_ids) for update of g
  ) locked_reviews;
  delete from public.ev_conversations where id=any(v_ids);
  get diagnostics v_conversations=row_count;
  with expired as (
    select id from public.ev_gap_reviews where expires_at<=now()
      order by expires_at,id limit 1000 for update skip locked
  ) delete from public.ev_gap_reviews where id in(select id from expired);
  get diagnostics v_gaps=row_count;
  insert into ev_private.retention_runs(conversations_deleted,gap_reviews_deleted)
    values(v_conversations,v_cascaded+v_gaps);
  return v_conversations;
end; $$;
commit;
