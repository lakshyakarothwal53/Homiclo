import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { ROLE_LABEL, type Role } from "@/lib/roles";

const COOKIE_NAME = "homiqlo_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: Role;
  branch: string;
};

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseSession(raw: string | undefined | null): SessionUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as SessionUser;
  } catch {
    return null;
  }
}

function setSessionCookie(user: SessionUser): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(user));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

// Reads the raw session cookie isomorphically: document.cookie on the client,
// the request Cookie header on the server (so the route guard works during SSR).
const readSessionCookie = createIsomorphicFn()
  .client((): string | undefined => {
    const match = document.cookie.split("; ").find((c) => c.startsWith(COOKIE_NAME + "="));
    return match?.slice(COOKIE_NAME.length + 1);
  })
  .server((): string | undefined => getCookie(COOKIE_NAME));

/* ── SUPABASE-SWAP ─────────────────────────────────────────────────────────
 * signIn / getSession / signOut are the only auth touch points. To move off
 * the mock, replace their bodies with Supabase Auth:
 *   signIn  -> supabase.auth.signInWithPassword({ email, password })
 *   getSession -> supabase.auth.getSession() (+ role from a `profiles` row/claim)
 *   signOut -> supabase.auth.signOut()
 * ROLE_ACCESS, the _app route guard, the Sidebar filter and the Topbar are
 * untouched by the swap. super_admins and verify_super_admin() (supabase/20_super_admins.sql)
 * then disappear along with the rest of this file's custom checks.
 * ──────────────────────────────────────────────────────────────────────── */

// employees.role stores the display strings offered on the Add Employee form,
// not the Role union — map them so DB-created accounts get the right access.
const EMPLOYEE_ROLE_MAP: Record<string, Role> = {
  admin: "branch_admin",
  "floor manager": "store_manager",
  supervisor: "store_manager",
  cashier: "cashier",
  inventory: "inventory",
  hr: "hr",
  salesman: "employee",
};

function toSessionRole(dbRole: string | null | undefined): Role {
  return EMPLOYEE_ROLE_MAP[(dbRole ?? "").trim().toLowerCase()] ?? "employee";
}

// Runs server-side only — createServerFn splits this handler (and everything
// it closes over: the Supabase super_admins RPC call, the employees query)
// into a server-only chunk. The browser bundle only ever gets a thin RPC stub.
const verifyCredentials = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }): Promise<SessionUser | null> => {
    const hash = await sha256(data.password);
    const normalizedEmail = data.email.trim().toLowerCase();
    return resolveUser(normalizedEmail, hash);
  });

/**
 * Authenticate and open a session.
 *
 * `expectedRole` is the role the user picked on the login screen. When given,
 * the credentials must belong to an account that actually HAS that role —
 * signing in as "Cashier" with an employee's password is rejected. The check
 * runs BEFORE the session cookie is written, so a refused login leaves no
 * session behind (a post-hoc check would have logged them in regardless).
 */
export async function signIn(
  email: string,
  password: string,
  expectedRole?: Role,
): Promise<SessionUser> {
  const resolved = await verifyCredentials({ data: { email, password } });
  if (!resolved) throw new Error("Invalid email or password");

  if (expectedRole && resolved.role !== expectedRole) {
    throw new Error(
      `These credentials are for ${ROLE_LABEL[resolved.role]}, not ${ROLE_LABEL[expectedRole]}. ` +
        `Select the correct role and try again.`,
    );
  }

  setSessionCookie(resolved);
  return resolved;
}

/**
 * Resolve credentials to a user without opening a session.
 *
 * Two Supabase-backed sources, checked in order:
 * - `super_admins` via the verify_super_admin() RPC — the break-glass Super
 *   Admin account. The table has no RLS policies at all; the RPC is
 *   SECURITY DEFINER so it can read it, and returns only sanitized fields —
 *   the password hash never leaves the database. `employees` has no role
 *   that maps to super_admin (see EMPLOYEE_ROLE_MAP — "Admin" is a BRANCH
 *   admin), so without this nobody could manage the catalogue or allocate
 *   stock to branches.
 * - `employees` — real accounts, created through Employees → Add Employee.
 */
async function resolveUser(normalizedEmail: string, hash: string): Promise<SessionUser | null> {
  try {
    const superAdminMatch = await findSuperAdmin(normalizedEmail, hash);
    if (superAdminMatch) return superAdminMatch;
  } catch (error) {
    console.error("Error checking Supabase for super admin:", error);
  }

  try {
    const employeeMatch = await findEmployeeByEmail(normalizedEmail, hash);
    if (employeeMatch) {
      return {
        id: employeeMatch.id,
        email: employeeMatch.email,
        name: employeeMatch.name,
        initials: employeeMatch.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase(),
        role: toSessionRole(employeeMatch.role),
        branch: employeeMatch.branch,
      };
    }
  } catch (error) {
    console.error("Error checking Supabase for employee:", error);
  }
  return null;
}

async function findSuperAdmin(email: string, passwordHash: string): Promise<SessionUser | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase.rpc("verify_super_admin", {
      p_email: email,
      p_password_hash: passwordHash,
    });
    if (error || !data || data.length === 0) return null;
    const row = data[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      initials: row.initials,
      role: "super_admin",
      branch: row.branch,
    };
  } catch {
    return null;
  }
}

async function findEmployeeByEmail(email: string, passwordHash: string) {
  try {
    // Dynamically import supabase only when needed for employee auth
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, branch, role, password_hash")
      .eq("email", email)
      .single();

    if (data && data.password_hash === passwordHash) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function getSession(): SessionUser | null {
  return parseSession(readSessionCookie());
}

export function signOut(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
