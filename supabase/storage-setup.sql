-- Supabase storage buckets for forum image and avatar uploads.
-- Run this in Supabase SQL editor after the core forum schema.

-- Create the public "forum-images" bucket referenced by discussion-storage.ts.
insert into storage.buckets (id, name, public)
values ('forum-images', 'forum-images', true)
on conflict (id) do nothing;

-- Create the public "forum-avatars" bucket for user avatar uploads.
insert into storage.buckets (id, name, public)
values ('forum-avatars', 'forum-avatars', true)
on conflict (id) do nothing;

-- Allow public (unauthenticated) read access since both buckets are public.
create policy "Public can view forum images"
  on storage.objects
  for select
  using (bucket_id = 'forum-images');

create policy "Public can view forum avatars"
  on storage.objects
  for select
  using (bucket_id = 'forum-avatars');

-- Allow authenticated users to upload images for the forum.
create policy "Authenticated users can upload forum images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'forum-images'
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to upload avatars.
create policy "Authenticated users can upload avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'forum-avatars'
    and auth.role() = 'authenticated'
  );

-- Allow users to delete their own uploaded images.
create policy "Users can delete own forum images"
  on storage.objects
  for delete
  using (
    bucket_id = 'forum-images'
    and auth.uid() = owner
  );

-- Allow users to delete their own avatars.
create policy "Users can delete own avatars"
  on storage.objects
  for delete
  using (
    bucket_id = 'forum-avatars'
    and auth.uid() = owner
  );
