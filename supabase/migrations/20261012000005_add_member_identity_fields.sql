-- Add the identity fields used by the officer roster and public member directory.
alter table public.members
  add column if not exists student_id text,
  add column if not exists full_name text;
