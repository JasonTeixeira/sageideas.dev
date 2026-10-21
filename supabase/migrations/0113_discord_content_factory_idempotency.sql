-- Enforce one content-factory draft per factory slot.
--
-- The content factory writes metadata.factory_key as:
-- discord-content-factory-v1:<YYYY-MM-DD>:<slot-key>
--
-- Application code already checks for an existing key before inserting, but cron
-- retries and concurrent invocations need a database-level guard.

create unique index if not exists discord_content_drafts_factory_key_uidx
  on public.discord_content_drafts ((metadata->>'factory_key'))
  where metadata->>'factory_key' is not null
    and metadata->>'source' = 'discord-content-factory-v1';

alter table public.discord_scheduled_runs
  drop constraint if exists discord_scheduled_runs_kind_check;

alter table public.discord_scheduled_runs
  add constraint discord_scheduled_runs_kind_check
  check (kind in ('daily_signal', 'weekly_recap', 'learning_lab', 'content_factory'));
