-- Run only in an approved project after migrations and live qualification.
-- This does not enable public signup, visitor storage or owner access.
begin;
set local role postgres;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('ev-retention','5 * * * *','select ev_private.run_maintenance();');
-- Bound scheduler history separately from application retention receipts.
select cron.schedule('ev-cron-history','17 3 * * *',
  $job$delete from cron.job_run_details where end_time < now() - interval '7 days'
    and jobid in (select jobid from cron.job where jobname in ('ev-retention','ev-cron-history'));$job$);
commit;
select jobname,schedule,active,username from cron.job where jobname in ('ev-retention','ev-cron-history');
