import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import usersData from "@/mocks/users.json";
import type { Role } from "@/lib/roles";

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

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const hash = await sha256(password);
  const match = USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === hash,
  );
  if (!match) throw new Error("Invalid email or password");
  const user = sanitize(match);
  setSessionCookie(user);
  return user;
}

export function getSession(): SessionUser | null {
  return parseSession(readSessionCookie());
}

export function signOut(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
