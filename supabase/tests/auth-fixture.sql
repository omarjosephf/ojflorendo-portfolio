-- Test-only Supabase identity boundary. NEVER apply this file to a Supabase project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key, is_anonymous boolean not null default true, created_at timestamptz not null default now(), last_sign_in_at timestamptz);
create table auth.sessions(id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, aal text not null default 'aal1', not_after timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
-- Emulate permissive legacy Supabase defaults so migration revokes are tested.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
