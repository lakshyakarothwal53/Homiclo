import { NAV, type NavGroup } from "@/lib/nav";

export type Role =
  | "super_admin"
  | "branch_admin"
  | "store_manager"
  | "inventory"
  | "cashier"
  | "employee"
  | "hr";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  branch_admin: "Branch Admin",
  store_manager: "Store Manager",
  inventory: "Inventory",
  cashier: "Cashier",
  employee: "Employee",
  hr: "HR Manager",
};

/**
 * Single source of truth for access. Keys map to NAV section labels.
 * `["*"]` means every section. Edit this map to tune what each role can see —
 * the sidebar filter and the route guard both read from here.
 *
 * NOTE: this controls *section* visibility only. Row-level branch isolation
 * (a branch_admin seeing only their own branch's rows) is enforced separately
 * by scoping queries to `useAuth().user.branch` — see `isBranchScoped()`.
 */
export const ROLE_ACCESS: Record<Role, string[]> = {
  super_admin: ["*"],
  branch_admin: [
    "Dashboard",
    "Employees",
    "Attendance",
    "Inventory",
    "Billing",
    "Reports",
    "Notifications",
  ],
  store_manager: ["Dashboard", "Attendance", "Inventory", "POS", "Billing", "Reports", "Settings"],
  inventory: ["Dashboard", "Inventory", "Reports", "Notifications", "Settings"],
  cashier: ["Dashboard", "POS", "Billing"],
  employee: ["Dashboard", "Attendance", "Notifications"],
  hr: ["Dashboard", "Employees", "Attendance", "Reports", "Settings"],
};

/**
 * Roles whose data is confined to a single branch. Super Admin is the only
 * role with cross-branch visibility; everyone else reads only their own branch.
 */
export function isBranchScoped(role: Role): boolean {
  return role !== "super_admin";
}

export function canSeeSection(role: Role, sectionLabel: string): boolean {
  const access = ROLE_ACCESS[role];
  return access.includes("*") || access.includes(sectionLabel);
}

export function allowedSections(role: Role): string[] {
  if (ROLE_ACCESS[role].includes("*")) return NAV.map((g) => g.label);
  return ROLE_ACCESS[role];
}

/** The base route for a NAV group — its own `to`, or the first segment of its children. */
function sectionRoot(group: NavGroup): string {
  if (group.to) return group.to;
  const first = group.children?.[0]?.to ?? "/";
  return "/" + first.split("/")[1];
}

/** Root paths a role may visit, derived from the NAV sections it can see. */
export function allowedPathPrefixes(role: Role): string[] {
  return NAV.filter((g) => canSeeSection(role, g.label)).map(sectionRoot);
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (ROLE_ACCESS[role].includes("*")) return true;
  const path = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return allowedPathPrefixes(role).some((root) =>
    root === "/" ? path === "/" : path === root || path.startsWith(root + "/"),
  );
}

/** Where to send a role after login or when blocked from a forbidden route. */
export function roleHome(role: Role): string {
  // Employees land on their personal attendance dashboard; every admin-type
  // role lands on the main dashboard, which renders branch- or company-wide
  // depending on the role (see src/routes/_app/index.tsx).
  if (role === "employee") return "/attendance/employee-checkin";
  return "/";
}
