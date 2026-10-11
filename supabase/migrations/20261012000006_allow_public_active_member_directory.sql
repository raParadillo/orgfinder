-- Public organization pages may show active member names and positions only.
alter table public.members enable row level security;

drop policy if exists "Anyone can view active organization members" on public.members;
create policy "Anyone can view active organization members"
on public.members
for select
to anon, authenticated
using (is_active = true);
