-- Allow officers to manage only files in their own organization folder.
drop policy if exists "Authenticated users can delete post images" on storage.objects;
drop policy if exists "Authenticated users can list post images" on storage.objects;

create policy "Authenticated users can delete post images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and exists (
    select 1
    from public.users
    where lower(users.email) = lower(auth.email())
      and users.role = 'officer'
      and users.is_active = true
      and storage.objects.name like 'org-' || users.org_id::text || '/%'
  )
);

create policy "Authenticated users can list own post images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-images'
  and exists (
    select 1
    from public.users
    where lower(users.email) = lower(auth.email())
      and users.role = 'officer'
      and users.is_active = true
      and storage.objects.name like 'org-' || users.org_id::text || '/%'
  )
);
