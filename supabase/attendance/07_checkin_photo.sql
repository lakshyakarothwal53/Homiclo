-- HOMIQLO attendance — geotagged check-in selfie
-- Run AFTER supabase/attendance/06_employee_geofence_rls.sql.
--
-- WHY: employees must capture a live selfie (with a location/time watermark
-- burned into the image, done client-side on a canvas) when marking
-- attendance. The finished image is uploaded to the `attendance-photos`
-- storage bucket and its public URL is stored on the check-in row so admins
-- can see who actually marked attendance from where.

-- 1. Where the selfie's public URL is stored.
alter table employee_checkins
  add column if not exists photo_url text;

-- 2. Public storage bucket for the selfies. Public so the admin pages
--    (Live Tracking, Daily Logs) can render the image straight from its URL.
--    Demo-grade like the rest of this app — tighten before production if the
--    selfies are considered sensitive.
insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', true)
on conflict (id) do nothing;

-- 3. Storage policies — anyone may read, anyone may upload into this bucket.
--    (Demo-grade: scope to authenticated employees before production.)
drop policy if exists "attendance photos read" on storage.objects;
create policy "attendance photos read"
  on storage.objects for select
  using (bucket_id = 'attendance-photos');

drop policy if exists "attendance photos insert" on storage.objects;
create policy "attendance photos insert"
  on storage.objects for insert
  with check (bucket_id = 'attendance-photos');
