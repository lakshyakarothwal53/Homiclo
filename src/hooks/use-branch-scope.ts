import { useAuth } from "@/components/auth/AuthProvider";
import { isBranchScoped } from "@/lib/roles";

/**
 * Branch isolation for the current session. Branch-scoped roles (everyone
 * except super_admin) are pinned to their own branch: pages must initialise
 * their branch state to `homeBranch` and, when `scoped`, hide the branch
 * selector and tag writes with `homeBranch`. Super Admin gets "all" plus a
 * free selector. Plain derived state — deliberately not a context.
 */
export function useBranchScope(): { scoped: boolean; homeBranch: string } {
  const { user } = useAuth();
  const scoped = !!user && isBranchScoped(user.role);
  return { scoped, homeBranch: scoped && user ? user.branch : "all" };
}

/**
 * Row isolation one level tighter than branch: the `employee` role may only
 * ever see their OWN attendance rows, never a colleague's. Pages pass
 * `employeeId` into the attendance hooks, which filter on it.
 *
 * NOTE the id space: this is `employees.id` (a uuid), which is what
 * employee_checkins and self-applied absent_records carry. The seeded
 * daily_logs/employee_attendance rows use a separate EMP0xx code space and
 * belong to demo people, so they correctly never match a real login.
 */
export function useSelfScope(): { selfOnly: boolean; employeeId?: string } {
  const { user, role } = useAuth();
  const selfOnly = role === "employee";
  return { selfOnly, employeeId: selfOnly ? user?.id : undefined };
}
