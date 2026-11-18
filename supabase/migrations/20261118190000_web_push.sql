-- Web Push for the night routine: reach the phone even when the app is closed.

create table life.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table life.push_subscriptions enable row level security;
create policy "owner only" on life.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on life.push_subscriptions to authenticated;

alter table life.user_settings
  add column timezone text not null default 'America/Port_of_Spain',
  add column last_night_push_at timestamptz;

-- Shared secret between the scheduler and the edge function. Generated inside
-- the database, so it never appears anywhere else.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'night_cron_secret');

create function life.check_cron_secret(candidate text) returns boolean
language sql security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'night_cron_secret' and decrypted_secret = candidate);
$$;
revoke all on function life.check_cron_secret(text) from public, anon, authenticated;
grant execute on function life.check_cron_secret(text) to service_role;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Every 5 minutes, ask the edge function to nag anyone whose night routine is overdue.
select cron.schedule('life-night-nag', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://kbghhdudnnyawbxfgdgi.supabase.co/functions/v1/night-nag',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'night_cron_secret')),
    body := '{}'::jsonb
  );
$$);
