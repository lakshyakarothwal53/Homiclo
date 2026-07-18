import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import usersData from "@/mocks/users.json";
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

type StoredUser = SessionUser & { passwordHash: string };
const USERS = usersData as StoredUser[];

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitize(u: StoredUser): SessionUser {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
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
 * untouched by the swap. users.json and its passwordHash field then disappear.
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
  const hash = await sha256(password);
  const normalizedEmail = email.trim().toLowerCase();

  const resolved = await resolveUser(normalizedEmail, hash);
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
 * Real accounts live in the Supabase `employees` table — created through
 * Employees → Add Employee. src/mocks/users.json is NOT demo data any more: it
 * holds exactly one break-glass Super Admin, because `employees` has no role
 * that maps to super_admin (see EMPLOYEE_ROLE_MAP — "Admin" is a BRANCH admin),
 * so without it nobody could manage the catalogue or allocate stock to
 * branches. Do not re-add demo logins here.
 */
async function resolveUser(normalizedEmail: string, hash: string): Promise<SessionUser | null> {
  const match = USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.passwordHash === hash,
  );
  if (match) return sanitize(match);

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
