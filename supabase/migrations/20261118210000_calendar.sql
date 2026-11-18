-- Phase 3: calendar events, prep checklists and post-event ratings.

create table life.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'other' check (kind in ('client', 'meeting', 'social', 'errand', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  notes text,
  rating int check (rating between 1 and 5),
  rating_note text,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index events_user_start_idx on life.events (user_id, starts_at);
alter table life.events enable row level security;
create policy "owner only" on life.events for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table life.event_prep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references life.events(id) on delete cascade,
  label text not null,
  -- due this many minutes before the event starts
  due_offset_minutes int not null default 60 check (due_offset_minutes >= 0),
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index event_prep_event_idx on life.event_prep (event_id, sort_order);
alter table life.event_prep enable row level security;
create policy "owner only" on life.event_prep for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on life.events, life.event_prep to authenticated;
grant all on life.events, life.event_prep to service_role;
