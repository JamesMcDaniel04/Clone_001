import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// The app builds and renders even before Supabase is configured — pages show a
// setup notice instead of crashing. See src/auth/RequireAuth.jsx.
export const isSupabaseConfigured = Boolean(url && anon && !url.includes("YOURPROJECT"));

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: {
        // Keep verified users signed in across reloads, tabs, and browser
        // restarts: the session is saved in localStorage and the access token is
        // refreshed in the background. Email confirmation is one-time — once the
        // address is verified a user only signs in again if their refresh token
        // actually expires, and never re-enters the emailed code.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "max-auth",
      },
    })
  : null;
