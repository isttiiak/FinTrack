-- ============================================================
-- 011_schedule_purge_deleted_users.sql
-- Idempotent — safe to re-run.
--
-- Schedules the monthly hard-delete of accounts soft-deleted more than
-- 30 days ago (private.purge_deleted_users(), moved out of `public` in
-- 007_lock_down_rpc.sql). Until now nothing called it, so the "30 days"
-- promise in the UI was never kept.
--
-- Runs as a plain SQL job under pg_cron's own database role — it never
-- goes through PostgREST, so the REVOKEs from 007 don't apply and the
-- function stays unreachable from the API. No secrets involved.
--
-- Same pattern as 005_schedule_notification_crons.sql. 03:30 on the 1st
-- keeps it off the 03:00 monthly-digest job.
-- ============================================================

create extension if not exists pg_cron;

select cron.unschedule('purge-deleted-users') where exists (select 1 from cron.job where jobname = 'purge-deleted-users');

select cron.schedule('purge-deleted-users', '30 3 1 * *', $$ select private.purge_deleted_users() $$);
