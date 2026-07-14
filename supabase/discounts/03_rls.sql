alter table discounts_dashboard enable row level security;
alter table discounts_active    enable row level security;
alter table discount_promos     enable row level security;
alter table discount_campaigns  enable row level security;
alter table discount_seasonal   enable row level security;
alter table discount_usage      enable row level security;

-- Demo-grade read policies — tighten to authenticated admins before production
create policy "anon read discounts_dashboard" on discounts_dashboard for select to anon, authenticated using (true);
create policy "anon read discounts_active"    on discounts_active    for select to anon, authenticated using (true);
create policy "anon read discount_promos"     on discount_promos     for select to anon, authenticated using (true);
create policy "anon read discount_campaigns"  on discount_campaigns  for select to anon, authenticated using (true);
create policy "anon read discount_seasonal"   on discount_seasonal   for select to anon, authenticated using (true);
create policy "anon read discount_usage"      on discount_usage      for select to anon, authenticated using (true);

-- Write policy for promo creation (used by useCreateDiscountPromo mutation)
create policy "auth insert discount_promos"   on discount_promos     for insert to authenticated with check (true);
