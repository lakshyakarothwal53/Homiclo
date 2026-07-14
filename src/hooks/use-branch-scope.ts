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
