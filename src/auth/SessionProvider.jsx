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
    const TEST_MODE = import.meta.env.VITE_DISABLE_AUTH === "true";

    // Register the listener first so a new (anonymous) session is captured.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (active) setSession(s); });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session && TEST_MODE) {
        // No-login test mode: create a throwaway anonymous session so RLS
        // (auth.uid() is not null) is satisfied — no SQL, no real login needed.
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

// Convenience accessor for display name / initials from Google metadata.
export function userDisplay(user) {
  if (!user) return { name: "", initials: "?", email: "" };
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || user.email || (user.is_anonymous ? "Guest" : "User");
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { name, initials, email: user.email, avatar: meta.avatar_url };
}
