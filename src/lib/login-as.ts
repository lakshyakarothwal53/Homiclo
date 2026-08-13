import { isRole, ROLE_LABEL, type Role } from "@/lib/roles";

/**
 * Which login portal a job role signs in through.
 *
 * A row in Settings › Roles ("Cashier", "Housekeeping", "Team Leader", …) is a
 * job title; the login page's tiles are access levels. `roles.login_as` binds
 * the two: an employee holding a role may only sign in on the tile that role
 * points at, and gets that access level's sections (see ROLE_ACCESS).
 *
 * Super Admin is deliberately not offered — it is a reserved break-glass
 * account resolved from the `super_admins` table, never from a job role.
 */
export const LOGIN_AS_OPTIONS: { value: Role; label: string }[] = (
  Object.keys(ROLE_LABEL) as Role[]
)
  .filter((r) => r !== "super_admin")
  .map((r) => ({ value: r, label: ROLE_LABEL[r] }));

// Exact job titles seen in the roles table / Add Employee form.
const EXACT: Record<string, Role> = {
  admin: "branch_admin",
  "branch admin": "branch_admin",
  "floor manager": "store_manager",
  "store manager": "store_manager",
  supervisor: "store_manager",
  cashier: "cashier",
  inventory: "inventory",
  "inventory manager": "inventory",
  hr: "hr",
  "hr manager": "hr",
  sales: "employee",
  salesman: "employee",
};

// Fallback for titles nobody has mapped yet — checked in order, first hit wins.
const KEYWORDS: [string, Role][] = [
  ["cashier", "cashier"],
  ["billing", "cashier"],
  ["pos", "cashier"],
  ["counter", "cashier"],
  ["inventory", "inventory"],
  ["stock", "inventory"],
  ["warehouse", "inventory"],
  ["manager", "store_manager"],
  ["supervisor", "store_manager"],
  ["admin", "branch_admin"],
  ["hr", "hr"],
];

/**
 * Best guess at a role's login portal from its name. Used to seed the column
 * and as the fallback when a role row has no `login_as` set yet — the stored
 * value always wins over this.
 *
 * Never returns super_admin: a job title cannot mint one. "Super Admin" as a
 * roles-table entry resolves to Branch Admin, the highest level an `employees`
 * account can hold.
 */
export function defaultLoginAs(roleName: string | null | undefined): Role {
  const key = (roleName ?? "").trim().toLowerCase();
  if (!key) return "employee";
  if (EXACT[key]) return EXACT[key];
  return KEYWORDS.find(([word]) => key.includes(word))?.[1] ?? "employee";
}

/** A stored `login_as` value is only honoured if it is a real, grantable role. */
export function isGrantableLoginAs(value: string | null | undefined): value is Role {
  return isRole(value) && value !== "super_admin";
}
