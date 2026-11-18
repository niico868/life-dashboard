-- The night-nag edge function runs as service_role (server-side only, never in the browser).
grant usage on schema life to service_role;
grant all on all tables in schema life to service_role;
alter default privileges in schema life grant all on tables to service_role;
