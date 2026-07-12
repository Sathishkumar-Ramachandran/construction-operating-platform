"use client";

import { createContext, useContext } from "react";
import type { AuthenticatedUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
});

/**
 * Exposes the server-resolved user to interactive Client Components.
 * This is a read-only mirror of server state, never the source of truth —
 * every mutation is re-authorized server-side regardless of what this
 * context contains.
 */
export function AuthProvider({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
