-- Supabase storage buckets for forum image and avatar uploads.
-- Run this in Supabase SQL editor after the core forum schema.

-- Create the public "forum-images" bucket referenced by discussion-storage.ts.
insert into storage.buckets (id, name, public)
values ('forum-images', 'forum-images', true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id = 'forum-images';

-- Create the public "forum-avatars" bucket for user avatar uploads.
insert into storage.buckets (id, name, public)
values ('forum-avatars', 'forum-avatars', true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id = 'forum-avatars';

-- Allow public (unauthenticated) read access since both buckets are public.
drop policy if exists "Public can view forum images" on storage.objects;
create policy "Public can view forum images"
  on storage.objects
  for select
  using (bucket_id = 'forum-images');

drop policy if exists "Public can view forum avatars" on storage.objects;
create policy "Public can view forum avatars"
  on storage.objects
  for select
  using (bucket_id = 'forum-avatars');

-- Allow authenticated users to upload images for the forum.
drop policy if exists "Authenticated users can upload forum images" on storage.objects;
create policy "Authenticated users can upload forum images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'forum-images'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload avatars.
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'forum-avatars'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own uploaded images.
drop policy if exists "Users can delete own forum images" on storage.objects;
create policy "Users can delete own forum images"
  on storage.objects
  for delete
  using (
    bucket_id = 'forum-images'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to replace files inside their own folder only.
drop policy if exists "Users can update own forum images" on storage.objects;
create policy "Users can update own forum images"
  on storage.objects
  for update
  using (
    bucket_id = 'forum-images'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'forum-images'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatars.
drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
  on storage.objects
  for delete
  using (
    bucket_id = 'forum-avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatar uploads use upsert, so updates need the same own-folder guard.
drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
  on storage.objects
  for update
  using (
    bucket_id = 'forum-avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'forum-avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );
