-- Settings › Roles: bind each job role to the login portal it signs in through.
--
-- employees.role holds a job title ("Cashier", "Housekeeping", …); login_as
-- holds the access level that title logs in as. src/lib/auth.ts reads it when
-- resolving a session, and the login screen rejects credentials whose role
-- does not match the tile that was picked — so a Cashier role can only sign in
-- on Cashier, an Employee role only on Employee, and so on.
--
-- Safe to re-run: the seed only fires the first time, so hand-tuned mappings
-- are never overwritten.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'roles' and column_name = 'login_as'
  ) then
    alter table public.roles add column login_as text not null default 'employee';

    -- Mirrors defaultLoginAs() in src/lib/login-as.ts: exact titles first,
    -- then keyword guesses, then Employee.
    update public.roles set login_as = case
      -- Branch Admin, not Super Admin: the real super admin is the break-glass
      -- account in `super_admins`, never an employee holding a job title.
      when lower(trim(role)) in ('super admin', 'admin', 'branch admin')       then 'branch_admin'
      when lower(trim(role)) in ('floor manager', 'store manager', 'supervisor') then 'store_manager'
      when lower(trim(role)) = 'cashier'                                       then 'cashier'
      when lower(trim(role)) in ('inventory', 'inventory manager')             then 'inventory'
      when lower(trim(role)) in ('hr', 'hr manager')                           then 'hr'
      when lower(trim(role)) in ('sales', 'salesman')                          then 'employee'
      when lower(role) similar to '%(cashier|billing|pos|counter)%'            then 'cashier'
      when lower(role) similar to '%(inventory|stock|warehouse)%'              then 'inventory'
      when lower(role) similar to '%(manager|supervisor)%'                     then 'store_manager'
      when lower(role) like '%admin%'                                          then 'branch_admin'
      when lower(role) like '%hr%'                                             then 'hr'
      else 'employee'
    end;
  end if;
end $$;

alter table public.roles drop constraint if exists roles_login_as_check;
alter table public.roles add constraint roles_login_as_check
  check (login_as in (
    'super_admin', 'branch_admin', 'store_manager', 'inventory', 'cashier', 'employee', 'hr'
  ));
