import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const SessionCtx = createContext({ session: null, user: null, loading: true, signOut: () => {} });

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    // Register the listener first so sign-in / sign-out are captured immediately.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (active) setSession(s); });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const user = session?.user ?? null;
  const signOut = () => supabase?.auth.signOut();
  return <SessionCtx.Provider value={{ session, user, loading, signOut }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);

// Convenience accessor for display name / initials.
export function userDisplay(user) {
  if (!user) return { name: "Signed out", initials: "—", email: "" };
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || user.email || "User";
  const initials = name
    .split(/[\s@.]+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { name, initials, email: user.email, avatar: meta.avatar_url };
}
