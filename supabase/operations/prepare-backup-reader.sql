-- Explicitly reviewed operator setup only; never part of automatic migrations.
-- This creates NOLOGIN with no password. Login/secret activation is separate.
-- Existing role causes an error rather than widening an unknown credential.
begin;
do $$ begin
  if (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from array['202609080001','202609090001','202609090002','202609090003','202609090004','202609090005','202609090006','202609090007','202609090008']::text[] then
    raise exception 'Reviewed migration history required';
  end if;
end $$;
create role ev_backup_reader nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 1;
alter role ev_backup_reader set default_transaction_read_only = on;
alter role ev_backup_reader set statement_timeout = '15s';
alter role ev_backup_reader set idle_in_transaction_session_timeout = '20s';
grant usage on schema public,ev_private,supabase_migrations to ev_backup_reader;
grant select(version) on supabase_migrations.schema_migrations to ev_backup_reader;
grant select(id,author_id,title,body,provenance,status,revision,created_at,updated_at) on public.ev_knowledge_drafts to ev_backup_reader;
create policy ev_backup_read on public.ev_knowledge_drafts for select to ev_backup_reader using(true);
grant select(id,user_id,app,created_at,expires_at,next_sequence) on public.ev_conversations to ev_backup_reader;
create policy ev_backup_read on public.ev_conversations for select to ev_backup_reader using(true);
grant select(id,conversation_id,request_id,sequence,role,body,created_at) on public.ev_messages to ev_backup_reader;
create policy ev_backup_read on public.ev_messages for select to ev_backup_reader using(true);
grant select(message_id,outcome,route,model,retrieved,cited,latency_ms,corpus_sha256,prompt_sha256) on public.ev_answer_events to ev_backup_reader;
create policy ev_backup_read on public.ev_answer_events for select to ev_backup_reader using(true);
grant select(message_id,user_id,helpful,updated_at) on public.ev_feedback to ev_backup_reader;
create policy ev_backup_read on public.ev_feedback for select to ev_backup_reader using(true);
grant select(message_id,payload) on public.ev_message_results to ev_backup_reader;
create policy ev_backup_read on public.ev_message_results for select to ev_backup_reader using(true);
grant select(conversation_id,request_id,input_sha256,created_at,result) on ev_private.generation_requests to ev_backup_reader;
create policy ev_backup_read on ev_private.generation_requests for select to ev_backup_reader using(true);
grant select(request_id,actor_id,draft_id,input_sha256,revision,status,saved_at) on ev_private.editorial_receipts to ev_backup_reader;
create policy ev_backup_read on ev_private.editorial_receipts for select to ev_backup_reader using(true);
grant select(id,question_key,diagnosis,status,note,draft_id,expires_at,updated_at,message_id,revision,last_request_id,last_input_sha256) on public.ev_gap_reviews to ev_backup_reader;
create policy ev_backup_read on public.ev_gap_reviews for select to ev_backup_reader using(true);
grant select(conversation_id,deleted_at) on ev_private.deleted_conversations to ev_backup_reader;
create policy ev_backup_read on ev_private.deleted_conversations for select to ev_backup_reader using(true);
commit;
