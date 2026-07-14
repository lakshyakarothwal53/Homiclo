import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";
import { canAccessPath, roleHome } from "@/lib/roles";

export const Route = createFileRoute("/_app")({
  // Runs on every navigation incl. direct URL / SSR loads, so a forbidden
  // section is unreachable by typing its URL — not just hidden in the sidebar.
  beforeLoad: ({ location }) => {
    const user = getSession();
    if (!user) throw redirect({ to: "/login" });
    if (!canAccessPath(user.role, location.pathname)) {
      throw redirect({ to: roleHome(user.role) });
    }
  },
  component: AppShell,
});
