-- Allow only active admin accounts to permanently delete organizations.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where lower(users.email) = lower(auth.email())
      and users.role = 'admin'
      and users.is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can delete organizations" on public.orgs;

create policy "Admins can delete organizations"
on public.orgs
for delete
to authenticated
using (public.is_admin());
