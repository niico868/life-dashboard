-- Per-user settings (one row each). First use: night routine reminder.

create table life.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  night_reminder_time time not null default '21:30',
  night_nag_minutes int not null default 15 check (night_nag_minutes between 5 and 120),
  night_reminder_on boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table life.user_settings enable row level security;
create policy "owner only" on life.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on life.user_settings to authenticated;
