import { NAV, type NavGroup } from "@/lib/nav";

export type Role = "super_admin" | "store_manager" | "inventory" | "cashier";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  store_manager: "Store Manager",
  inventory: "Inventory",
  cashier: "Cashier",
};

/**
 * Single source of truth for access. Keys map to NAV section labels.
 * `["*"]` means every section. Edit this map to tune what each role can see —
 * the sidebar filter and the route guard both read from here.
 */
export const ROLE_ACCESS: Record<Role, string[]> = {
  super_admin: ["*"],
  store_manager: ["Dashboard", "Attendance", "Inventory", "POS", "Billing", "Reports", "Settings"],
  inventory: ["Dashboard", "Inventory", "Reports", "Notifications", "Settings"],
  cashier: ["Dashboard", "POS", "Billing"],
};

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
export function roleHome(_role: Role): string {
  return "/";
}
