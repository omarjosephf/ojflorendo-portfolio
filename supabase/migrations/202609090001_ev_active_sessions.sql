-- Enforce revocation at the database as well as the Auth HTTP boundary.
-- Existing signed JWTs can otherwise remain usable through PostgREST after logout.
begin;
create function ev_private.active_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = case
      when (select auth.jwt())->>'session_id' ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
      then ((select auth.jwt())->>'session_id')::uuid else null end
      and s.user_id = (select auth.uid())
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function ev_private.active_session() from public, anon, authenticated, service_role;
grant execute on function ev_private.active_session() to authenticated;

create or replace function ev_private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select ev_private.active_session())
    and coalesce((select auth.jwt())->>'aal' = 'aal2', false)
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false'
    and exists (select 1 from ev_private.owners where user_id = (select auth.uid()) and enabled)
    and exists (select 1 from auth.sessions s where s.id::text = (select auth.jwt())->>'session_id'
      and s.user_id = (select auth.uid()) and s.aal::text = 'aal2');
$$;

create policy ev_conversations_active_session on public.ev_conversations
  as restrictive for all to authenticated
  using((select ev_private.active_session())) with check((select ev_private.active_session()));
create policy ev_messages_active_session on public.ev_messages
  as restrictive for all to authenticated
  using((select ev_private.active_session())) with check((select ev_private.active_session()));
create policy ev_answer_events_active_session on public.ev_answer_events
  as restrictive for all to authenticated
  using((select ev_private.active_session())) with check((select ev_private.active_session()));
create policy ev_feedback_active_session on public.ev_feedback
  as restrictive for all to authenticated
  using((select ev_private.active_session())) with check((select ev_private.active_session()));
create policy ev_knowledge_drafts_active_session on public.ev_knowledge_drafts
  as restrictive for all to authenticated
  using((select ev_private.active_session())) with check((select ev_private.active_session()));
create policy ev_gap_reviews_active_session on public.ev_gap_reviews
  as restrictive for all to authenticated
  using((select ev_private.active_session())) with check((select ev_private.active_session()));

-- SECURITY DEFINER RPCs bypass RLS, so they must independently require a live session.

create or replace function public.ev_create_conversation(p_id uuid, p_app text default 'ev') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_existing public.ev_conversations%rowtype;
begin
  if not ev_private.active_session() then raise exception 'Active session required' using errcode='42501'; end if;
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

create or replace function public.ev_append_user_message(p_conversation_id uuid, p_request_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_conversation public.ev_conversations%rowtype; v_message public.ev_messages%rowtype; v_id uuid;
begin
  if not ev_private.active_session() then raise exception 'Active session required' using errcode='42501'; end if;
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

create or replace function public.ev_set_feedback(p_message_id uuid, p_helpful boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not ev_private.active_session() then raise exception 'Active session required' using errcode='42501'; end if;
  if not exists(select 1 from public.ev_messages m join public.ev_conversations c on c.id=m.conversation_id
    where m.id=p_message_id and m.role='assistant' and c.user_id=auth.uid() and c.expires_at > now()) then
    raise exception 'Message unavailable' using errcode='42501';
  end if;
  insert into public.ev_feedback(message_id,user_id,helpful) values(p_message_id,auth.uid(),p_helpful)
    on conflict(message_id) do update set helpful=excluded.helpful, updated_at=now();
end; $$;

commit;
