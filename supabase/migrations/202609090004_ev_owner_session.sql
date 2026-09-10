begin;
-- Only the caller's trusted allowlist state; no user identifiers or role mutation.
create function public.ev_owner_session_state() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('owner',
    ev_private.active_session()
    and exists(select 1 from auth.users u join ev_private.owners o on o.user_id=u.id
      where u.id=auth.uid() and not u.is_anonymous and o.enabled),
    'assured',ev_private.is_owner());
$$;
revoke all on function public.ev_owner_session_state() from public, anon, authenticated, service_role;
grant execute on function public.ev_owner_session_state() to authenticated;
commit;
