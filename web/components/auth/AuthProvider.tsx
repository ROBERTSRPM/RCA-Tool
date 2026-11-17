"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { markAuthReady, setStoreUser } from "@/lib/store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type AuthState =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; user: { id: string; email: string } };

interface AuthCtx {
  state: AuthState;
  /** False in local-only mode (no Supabase variables in the build). */
  configured: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: isSupabaseConfigured ? "loading" : "out",
  });

  useEffect(() => {
    const db = getSupabase();
    if (!db) {
      setStoreUser(null);
      markAuthReady();
      return;
    }
    const apply = (user: { id: string; email?: string } | null | undefined) => {
      // Select the store before React re-renders so children read the right one.
      setStoreUser(user?.id ?? null);
      markAuthReady();
      setState((prev) => {
        if (!user) return prev.status === "out" ? prev : { status: "out" };
        if (prev.status === "in" && prev.user.id === user.id && prev.user.email === (user.email ?? "")) {
          return prev;
        }
        return { status: "in", user: { id: user.id, email: user.email ?? "" } };
      });
    };
    const { data } = db.auth.onAuthStateChange((_event, session) => apply(session?.user));
    void db.auth.getSession().then(({ data: s }) => apply(s.session?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    // Global scope: revoke every session of this account, not just this browser.
    const db = getSupabase();
    if (!db) return;
    const { error } = await db.auth.signOut({ scope: "global" });
    // If the server refuses (expired session, deleted user) still end it here.
    if (error) await db.auth.signOut({ scope: "local" });
  }, []);

  const value = useMemo(
    () => ({ state, configured: isSupabaseConfigured, signOut }),
    [state, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
