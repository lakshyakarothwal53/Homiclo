import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  getSession,
  signIn as authSignIn,
  signOut as authSignOut,
  type SessionUser,
} from "@/lib/auth";
import type { Role } from "@/lib/roles";

type AuthContextValue = {
  user: SessionUser | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // getSession() reads the session cookie isomorphically, so server-rendered
  // and hydrated client state agree.
  const [user, setUser] = useState<SessionUser | null>(() => getSession());

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await authSignIn(email, password);
    setUser(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    authSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
