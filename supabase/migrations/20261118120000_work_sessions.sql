-- Phase 2: work timer sessions + check-in notes

create table life.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text,
  mode text not null default 'stopwatch' check (mode in ('stopwatch', 'pomodoro')),
  pomodoro_minutes int check (pomodoro_minutes between 1 and 180),
  status text not null default 'running' check (status in ('running', 'paused', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- seconds already banked from earlier running stretches
  active_seconds int not null default 0,
  -- when the current running stretch began (null while paused/ended)
  resumed_at timestamptz default now(),
  summary text,
  created_at timestamptz not null default now()
);

create index work_sessions_user_started_idx on life.work_sessions (user_id, started_at desc);

alter table life.work_sessions enable row level security;
create policy "owner only" on life.work_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table life.session_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references life.work_sessions(id) on delete cascade,
  kind text not null check (kind in ('working_on', 'distraction', 'note')),
  body text not null,
  created_at timestamptz not null default now()
);

create index session_notes_session_idx on life.session_notes (session_id, created_at);

alter table life.session_notes enable row level security;
create policy "owner only" on life.session_notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on life.work_sessions, life.session_notes to authenticated;
