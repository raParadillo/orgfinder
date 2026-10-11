-- Post images are served by public URLs; clients do not need to list bucket files.
drop policy if exists "Authenticated users can list post images" on storage.objects;
