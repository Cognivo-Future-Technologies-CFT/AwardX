begin;

-- Ensure the media bucket exists and is private.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do update
set public = false;

-- Allow authenticated users to upload only into approved media folders.
drop policy if exists media_objects_insert_auth on storage.objects;

create policy media_objects_insert_auth on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] in ('avatars', 'submissions', 'program-pages')
);

-- Allow authenticated users to read objects in approved folders.
-- This is required for createSignedUrl in client code.
drop policy if exists media_objects_select_auth on storage.objects;

create policy media_objects_select_auth on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] in ('avatars', 'submissions', 'program-pages')
);

commit;
