import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const SessionCtx = createContext({ session: null, user: null, loading: true, anonError: null });

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [anonError, setAnonError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    // Register the listener first so a new (anonymous) session is captured.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (active) setSession(s); });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        // Shared workspace mode: create an anonymous Supabase session so RLS
        // policies requiring auth.uid() are satisfied without a hosted login.
        const { error } = await supabase.auth.signInAnonymously();
        if (active && error) setAnonError(error.message);
        // onAuthStateChange delivers the new session.
      } else {
        setSession(data.session);
      }
      if (active) setLoading(false);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const user = session?.user ?? null;
  return <SessionCtx.Provider value={{ session, user, loading, anonError }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);

// Convenience accessor for display name / initials.
export function userDisplay(user) {
  if (!user) return { name: "Shared workspace", initials: "CL", email: "" };
  if (user.is_anonymous) return { name: "Shared workspace", initials: "CL", email: "" };
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || user.email || "User";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { name, initials, email: user.email, avatar: meta.avatar_url };
}
