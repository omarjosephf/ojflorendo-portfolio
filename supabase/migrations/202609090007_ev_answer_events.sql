-- Trusted observations are saved atomically with the generated response.
-- A model refusal is not proof of absent knowledge or a retrieval defect.
begin;
-- Diagnostics are owner-only, including direct REST access with a guest token.
alter policy ev_events_read on public.ev_answer_events using((select ev_private.is_owner()) and exists(select 1 from public.ev_messages m where m.id=message_id));
alter table public.ev_answer_events drop constraint ev_answer_events_outcome_check;
alter table public.ev_answer_events add constraint ev_answer_events_outcome_check
  check(outcome in ('answered','missing_content','retrieval_miss','provider_failure','policy_boundary','not_covered'));

create function public.ev_complete_generation_event(p_user_id uuid,p_conversation_id uuid,p_request_id uuid,p_input_sha256 text,p_result jsonb,p_event jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_message uuid; v_existing public.ev_answer_events%rowtype; v_retrieved text[]; v_cited text[]; v_latency integer;
begin
  if p_event is null or jsonb_typeof(p_event)<>'object' or octet_length(p_event::text)>8000 then
    raise exception 'Invalid observation' using errcode='22000';
  end if;
  if (select count(*) from jsonb_object_keys(p_event))<>9 or
    not p_event ?& array['version','outcome','route','model','retrieved','cited','latencyMs','corpusSha256','promptSha256'] or
    p_event->'version' is distinct from '1'::jsonb or coalesce(p_event->>'outcome','') not in ('answered','not_covered','policy_boundary') or
    coalesce(p_event->>'route','') not in ('primary','fallback','none') or
    jsonb_typeof(p_event->'retrieved')<>'array' or jsonb_typeof(p_event->'cited')<>'array' or
    jsonb_typeof(p_event->'latencyMs')<>'number' or (p_event->>'latencyMs')!~'^[0-9]{1,6}$' or
    coalesce(p_event->>'corpusSha256','')!~'^[a-f0-9]{64}$' or coalesce(p_event->>'promptSha256','')!~'^[a-f0-9]{64}$' or
    ((p_event->>'route'='none')<>(p_event->'model'='null'::jsonb)) or
    (p_event->'model'<>'null'::jsonb and (jsonb_typeof(p_event->'model')<>'string' or length(p_event->>'model') not between 1 and 100)) then
    raise exception 'Invalid observation' using errcode='22000';
  end if;
  if exists(select 1 from jsonb_array_elements((p_event->'retrieved')||(p_event->'cited')) s where jsonb_typeof(s)<>'string' or length(s#>>'{}') not between 1 and 200) then
    raise exception 'Invalid sources' using errcode='22000';
  end if;
  v_retrieved := array(select jsonb_array_elements_text(p_event->'retrieved'));
  v_cited := array(select jsonb_array_elements_text(p_event->'cited'));
  v_latency := (p_event->>'latencyMs')::integer;
  if cardinality(v_retrieved)>20 or cardinality(v_cited)>20 or not v_cited<@v_retrieved or v_latency>600000 or
    cardinality(v_retrieved)<>(select count(distinct x) from unnest(v_retrieved) x) or
    cardinality(v_cited)<>(select count(distinct x) from unnest(v_cited) x) or
    p_event->>'route'<>coalesce(p_result->>'modelRoute','none') or
    (case when p_event->>'outcome'='answered' then p_result->>'state'<>'answered' or cardinality(v_cited)=0 or p_event->>'route'='none'
      else p_result->>'state'<>'not-covered' or cardinality(v_cited)<>0 end) then
    raise exception 'Observation/result mismatch' using errcode='22000';
  end if;
  if p_event->>'outcome'='answered' then
    if jsonb_typeof(p_result->'citations') is distinct from 'array' then raise exception 'Invalid citations' using errcode='22000'; end if;
    if exists(select 1 from jsonb_array_elements(p_result->'citations') c where not coalesce(c->>'sourceId','')=any(v_cited)) or
      cardinality(v_cited)<>(select count(distinct c->>'sourceId') from jsonb_array_elements(p_result->'citations') c) then
      raise exception 'Citation mismatch' using errcode='22000';
    end if;
  end if;
  -- This obtains the same conversation lock as claim/deletion/retention and
  -- rolls back the response write if observation insertion fails.
  v_message := public.ev_complete_generation(p_user_id,p_conversation_id,p_request_id,p_input_sha256,p_result);
  select * into v_existing from public.ev_answer_events where message_id=v_message;
  if found then
    if row(v_existing.outcome,v_existing.route,v_existing.model,v_existing.retrieved,v_existing.cited,v_existing.latency_ms,v_existing.corpus_sha256,v_existing.prompt_sha256)
      is distinct from row(p_event->>'outcome',p_event->>'route',p_event->>'model',v_retrieved,v_cited,v_latency,p_event->>'corpusSha256',p_event->>'promptSha256') then
      raise exception 'Idempotency conflict' using errcode='22000';
    end if;
    return v_message;
  end if;
  insert into public.ev_answer_events(message_id,outcome,route,model,retrieved,cited,latency_ms,corpus_sha256,prompt_sha256)
    values(v_message,p_event->>'outcome',p_event->>'route',p_event->>'model',v_retrieved,v_cited,v_latency,p_event->>'corpusSha256',p_event->>'promptSha256');
  return v_message;
end; $$;
revoke all on function public.ev_complete_generation_event(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.ev_complete_generation_event(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
commit;
