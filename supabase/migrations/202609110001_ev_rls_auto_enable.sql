-- Capture the RLS auto-enforcement that already exists in the managed database.
--
-- The `ensure_rls` event trigger and its `rls_auto_enable()` function were found
-- live in the staging project on 11 September 2026 with no migration behind them.
-- They work: every table created in `public` has row level security enabled
-- automatically, which is a real defence against a new table shipping readable.
-- But an object that exists only in the running database is invisible to review
-- and disappears the moment the database is rebuilt from this directory. The
-- backup contract's schema digest covers reviewed migration source, and
-- docs/runbooks/ev-backups.md is explicit that it "is not an attestation that
-- every live grant or function is unchanged" — this is that gap, closed.
--
-- Applying this to the existing project is a no-op for the function (identical
-- body) and skipped for the trigger (already present), EXCEPT for the revoke
-- below, which is a deliberate change. See the note on it.
begin;

create or replace function public.rls_auto_enable() returns event_trigger
language plpgsql security definer set search_path to 'pg_catalog' as $fn$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg\_toast%' and cmd.schema_name not like 'pg\_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$fn$;

-- Deliberate change, not a capture. The security advisor flags this function as
-- executable by `anon` and `authenticated` over the REST API. The practical risk
-- is low — it returns `event_trigger`, which PostgREST does not expose as a
-- callable RPC, `pg_event_trigger_ddl_commands()` errors outside an event-trigger
-- context, and its only effect would be to *enable* RLS — but a definer-rights
-- function needs no grant to unauthenticated callers, and the event trigger
-- invokes it regardless of who may execute it. Remove this line if you would
-- rather keep the live grants exactly as they are.
-- PUBLIC must be named explicitly: Postgres grants EXECUTE on a new function to
-- PUBLIC by default, so revoking from the two named roles alone leaves the
-- implicit grant in place and the advisor finding standing. Event-trigger
-- invocation does not consult EXECUTE privilege, so `ensure_rls` keeps working.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls on ddl_command_end execute function public.rls_auto_enable();
  end if;
end
$$;

commit;
