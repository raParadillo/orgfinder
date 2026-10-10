-- Permit only active admins to delete and verify organization logos.
drop policy if exists "Authenticated users can delete organization logos" on storage.objects;

create policy "Authenticated users can delete organization logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'org-logos'
  and public.is_admin()
);

drop policy if exists "Authenticated users can list organization logos" on storage.objects;

create policy "Authenticated users can list organization logos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'org-logos'
  and public.is_admin()
);
