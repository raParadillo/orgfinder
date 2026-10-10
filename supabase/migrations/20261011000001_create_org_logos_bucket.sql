-- Create the storage bucket used for organization logos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-logos',
  'org-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload organization logos" on storage.objects;
create policy "Authenticated users can upload organization logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'org-logos'
);

drop policy if exists "Authenticated users can update organization logos" on storage.objects;
create policy "Authenticated users can update organization logos"
on storage.objects
for update
to authenticated
using (bucket_id = 'org-logos')
with check (bucket_id = 'org-logos');

drop policy if exists "Authenticated users can delete organization logos" on storage.objects;
create policy "Authenticated users can delete organization logos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'org-logos');
