-- Allow signed-in administrators to remove organization logos.
drop policy if exists "Authenticated users can delete organization logos" on storage.objects;

create policy "Authenticated users can delete organization logos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'org-logos');
