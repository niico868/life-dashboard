-- Beliefs + identity statement, the daily affirmation habit, and the Fuel log.

-- One big "I am…" line shown on the This-is-him card and in the morning affirmation.
alter table life.vision add column if not exists identity text;

-- Marks app-managed habits. 'affirmation' = the morning "read who I am" tick.
alter table life.habits add column if not exists special text check (special in ('affirmation'));

-- Fuel: saved videos/links and the takeaways Nico wrote about them.
create table life.fuel (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text,
  title text not null,
  takeaways text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index fuel_user_created_idx on life.fuel (user_id, created_at desc);
alter table life.fuel enable row level security;
create policy "owner only" on life.fuel for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on life.fuel to authenticated;
grant all on life.fuel to service_role;
