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
    "Discounts",
    "Reports",
    "Notifications",
  ],
  store_manager: ["Dashboard", "Attendance", "Inventory", "POS", "Billing", "Reports", "Settings"],
  // Attendance is granted to `inventory` and `cashier` for self-service only —
  // every supervisory leaf under it is hidden from them via SELF_SERVICE_ONLY
  // in nav.ts, leaving just "My Check-in".
  inventory: ["Dashboard", "Inventory", "Attendance", "Reports", "Notifications", "Settings"],
  cashier: ["Dashboard", "POS", "Billing", "Attendance"],
  // No Notifications: those are operational alerts (low stock, payments,
  // system) aimed at staff who act on them, not at individual employees.
  employee: ["Dashboard", "Attendance"],
  hr: ["Dashboard", "Employees", "Attendance", "Reports", "Settings"],
};

export function isRole(value: string | null | undefined): value is Role {
  return !!value && value in ROLE_ACCESS;
}

/**
 * Roles whose data is confined to a single branch. Super Admin is the only
 * role with cross-branch visibility; everyone else reads only their own branch.
 */
export function isBranchScoped(role: Role): boolean {
  return role !== "super_admin";
}

/**
 * Roles allowed to approve or decline an employee's leave request on the
 * Absent Report. Branch-scoped approvers only ever see their own branch's
 * rows (queries are filtered by branch), so this is a role check, not a
 * branch check.
 */
export function canApproveLeave(role: Role): boolean {
  return role === "super_admin" || role === "branch_admin" || role === "hr";
}

/**
 * Super Admin and Branch Admin own the product catalogue: creating, editing,
 * deleting and importing products, and allocating stock out to branches.
 * Branch Admin's view is still branch-scoped (see `isBranchScoped`), but their
 * writes go to the same global `products` table Super Admin writes to — there
 * is no per-branch product catalogue. Every other role consumes what has been
 * sent to their branch (see `branch_inventory`), so they get a read-only
 * product list.
 */
export function canManageCatalogue(role: Role): boolean {
  return role === "super_admin" || role === "branch_admin";
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
  const path = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  // Leaf-level exclusions: NAV items marked hiddenFor a role are also
  // unreachable by typing their URL (e.g. Super Admin's personal pages).
  const hiddenLeaf = NAV.some((g) =>
    g.children?.some((c) => c.hiddenFor?.includes(role) && path === c.to),
  );
  if (hiddenLeaf) return false;
  if (ROLE_ACCESS[role].includes("*")) return true;
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
