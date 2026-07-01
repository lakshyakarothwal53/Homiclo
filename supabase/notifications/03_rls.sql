alter table notifications enable row level security;

-- Demo-grade read policy — tighten to authenticated admins before production
create policy "anon read notifications" on notifications for select to anon, authenticated using (true);
