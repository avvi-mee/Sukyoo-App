-- Storage buckets for health records and life-story recordings. Both are
-- uploaded by the client at path "<owner_id>/<filename>" (see
-- useUploadHealthRecord / LifeStoryRecorderScreen) — that leading folder
-- is what these policies check ownership against.
--
-- This is a SEPARATE RLS layer from the public schema: storage.objects has
-- its own policies, independent of the health_records/life_story_entries
-- table policies in 0002/0006. Uploading a health_records ROW without a
-- matching storage policy would leave the actual FILE unreadable (default
-- deny) or, if the bucket were public, readable by anyone with the URL —
-- neither is correct, hence this migration.
--
-- Not covered by the PGlite test harness used elsewhere in this project —
-- the `storage` schema and its helper functions (storage.foldername) are
-- provided by the Supabase platform, not vanilla Postgres, so this can only
-- be verified against a real Supabase project.

insert into storage.buckets (id, name, public)
values ('health-records', 'health-records', false), ('life-stories', 'life-stories', false)
on conflict (id) do nothing;

-- Family access mirrors the same has_permission() check as the table-level
-- RPCs (get_health_records / get_life_story_entries) — a family member who
-- has been granted access can read the file a signed URL points at; upload
-- stays owner-only either way.

create policy "health_records_storage_select" on storage.objects for select using (
  bucket_id = 'health-records'
  and has_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'health_record', null)
);

create policy "health_records_storage_insert_owner" on storage.objects for insert with check (
  bucket_id = 'health-records' and (storage.foldername(name))[1]::uuid = auth.uid()
);

create policy "life_stories_storage_select" on storage.objects for select using (
  bucket_id = 'life-stories'
  and has_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'life_story_entry', null)
);

create policy "life_stories_storage_insert_owner" on storage.objects for insert with check (
  bucket_id = 'life-stories' and (storage.foldername(name))[1]::uuid = auth.uid()
);
