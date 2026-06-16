import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const SessionCtx = createContext({ session: null, user: null, loading: true });

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  return <SessionCtx.Provider value={{ session, user, loading }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);

// Convenience accessor for display name / initials from Google metadata.
export function userDisplay(user) {
  if (!user) return { name: "", initials: "?", email: "" };
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
