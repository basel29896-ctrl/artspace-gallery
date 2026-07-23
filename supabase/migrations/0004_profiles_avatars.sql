-- ArtSpace Gallery — artist profile links + avatar storage.
--
-- Adds optional website / Instagram to the public profile, and a public
-- `avatars` storage bucket that a user may write only within their own uid
-- folder (mirrors the originals/display policy style from 0001).

alter table public.users
  add column if not exists website   text check (website is null or char_length(website) <= 200),
  add column if not exists instagram text check (instagram is null or char_length(instagram) <= 60);

-- ---------------------------------------------------------------- avatars bucket

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read; write/replace/delete only under the caller's own uid folder.
create policy avatars_select_all on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_insert_own on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
