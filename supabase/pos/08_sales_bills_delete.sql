-- HOMIQLO — POS: delete policy for the global pos_transactions table.
-- Run after 01…07. pos_transactions_branches already has a delete policy
-- (added alongside its write policies); the global table was missing one,
-- needed for the Delete button on Billing > Sales Bills ("All Branches" view).
--
-- ⚠️ DEMO-GRADE POLICY (anon can write) — consistent with the rest of the project.

drop policy if exists pos_transactions_delete on pos_transactions;
create policy pos_transactions_delete
  on pos_transactions for delete to anon, authenticated using (true);
