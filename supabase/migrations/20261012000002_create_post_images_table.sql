-- Store the public image URL associated with each organization post.
create table if not exists public.post_images (
  post_id bigint primary key,
  img_url text not null
);

alter table public.post_images enable row level security;

drop policy if exists "Anyone can view post images" on public.post_images;
create policy "Anyone can view post images"
on public.post_images
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create post images" on public.post_images;
create policy "Authenticated users can create post images"
on public.post_images
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update post images" on public.post_images;
create policy "Authenticated users can update post images"
on public.post_images
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete post images" on public.post_images;
create policy "Authenticated users can delete post images"
on public.post_images
for delete
to authenticated
using (true);
