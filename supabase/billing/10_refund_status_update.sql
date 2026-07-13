-- HOMIQLO — Billing: allow updating a refund's status.
-- Run AFTER 09_refund_items.sql in the Supabase SQL editor.
--
-- billing_refunds only ever had insert/read policies — a refund's status
-- (Processing/Completed/On Hold/Rejected) could be set once at creation but
-- never changed afterward. Refund Management's Status column now lets staff
-- update it in place, which needs an update policy to actually write.

create policy billing_refunds_update
  on billing_refunds for update
  to anon, authenticated
  using (true)
  with check (true);
