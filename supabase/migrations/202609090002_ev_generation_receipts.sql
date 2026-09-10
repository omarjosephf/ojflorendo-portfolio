-- One durable generation claim per user turn. Only the trusted server can claim
-- or complete it. An uncertain/incomplete claim never grants a second dispatch.
begin;
create table ev_private.generation_requests (
  conversation_id uuid not null references public.ev_conversations(id) on delete cascade,
  request_id uuid not null,
  input_sha256 text not null check(input_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  result jsonb,
  primary key(conversation_id,request_id),
  check(result is null or (jsonb_typeof(result)='object' and octet_length(result::text)<=24000))
);
alter table ev_private.generation_requests enable row level security;
revoke all on ev_private.generation_requests from public, anon, authenticated, service_role;
create table public.ev_message_results (
  message_id uuid primary key references public.ev_messages(id) on delete cascade,
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=24000)
);
alter table public.ev_message_results enable row level security;
revoke all on public.ev_message_results from public, anon, authenticated, service_role;
grant select on public.ev_message_results to authenticated;
create policy ev_message_results_read on public.ev_message_results for select to authenticated
  using((select ev_private.active_session()) and exists(select 1 from public.ev_messages m where m.id=message_id));

create function public.ev_claim_generation(p_user_id uuid,p_conversation_id uuid,p_request_id uuid,p_input_sha256 text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_existing ev_private.generation_requests%rowtype;
begin
  perform 1 from public.ev_conversations where id=p_conversation_id and user_id=p_user_id and expires_at>now() for update;
  if not found or not exists(select 1 from public.ev_messages where conversation_id=p_conversation_id and request_id=p_request_id and role='user') then
    raise exception 'Conversation unavailable' using errcode='42501';
  end if;
  select * into v_existing from ev_private.generation_requests where conversation_id=p_conversation_id and request_id=p_request_id;
  if found then
    if v_existing.input_sha256<>p_input_sha256 then raise exception 'Idempotency conflict' using errcode='22000'; end if;
    return jsonb_build_object('claimed',false,'result',v_existing.result);
  end if;
  insert into ev_private.generation_requests(conversation_id,request_id,input_sha256) values(p_conversation_id,p_request_id,p_input_sha256);
  return jsonb_build_object('claimed',true,'result',null);
end; $$;

create function public.ev_complete_generation(p_user_id uuid,p_conversation_id uuid,p_request_id uuid,p_input_sha256 text,p_result jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_conversation public.ev_conversations%rowtype; v_request ev_private.generation_requests%rowtype; v_message uuid; v_body text;
begin
  select * into v_conversation from public.ev_conversations where id=p_conversation_id and user_id=p_user_id and expires_at>now() for update;
  if not found then raise exception 'Conversation unavailable' using errcode='42501'; end if;
  select * into v_request from ev_private.generation_requests where conversation_id=p_conversation_id and request_id=p_request_id;
  if not found then raise exception 'Generation was not admitted' using errcode='42501'; end if;
  if v_request.input_sha256<>p_input_sha256 then raise exception 'Idempotency conflict' using errcode='22000'; end if;
  if v_request.result is not null then
    if v_request.result<>p_result then raise exception 'Idempotency conflict' using errcode='22000'; end if;
    select id into v_message from public.ev_messages where conversation_id=p_conversation_id and request_id=p_request_id and role='assistant';
    return v_message;
  end if;
  if p_result is null or jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>24000 or coalesce(p_result->>'state','') not in ('answered','not-covered','unavailable') then
    raise exception 'Invalid answer receipt' using errcode='22000';
  end if;
  v_body := case when p_result->>'state'='unavailable' then 'An answer was unavailable for this question.' else p_result->>'answer' end;
  insert into public.ev_messages(conversation_id,request_id,sequence,role,body)
    values(p_conversation_id,p_request_id,v_conversation.next_sequence,'assistant',v_body) returning id into v_message;
  insert into public.ev_message_results(message_id,payload) values(v_message,p_result);
  update public.ev_conversations set next_sequence=next_sequence+1 where id=p_conversation_id;
  update ev_private.generation_requests set result=p_result where conversation_id=p_conversation_id and request_id=p_request_id;
  return v_message;
end; $$;
revoke all on function public.ev_claim_generation(uuid,uuid,uuid,text), public.ev_complete_generation(uuid,uuid,uuid,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.ev_claim_generation(uuid,uuid,uuid,text), public.ev_complete_generation(uuid,uuid,uuid,text,jsonb) to service_role;
commit;
