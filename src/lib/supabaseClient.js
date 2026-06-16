import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The app builds and renders even before Supabase is configured — pages show a
// setup notice instead of crashing. See src/auth/RequireAuth.jsx.
export const isSupabaseConfigured = Boolean(url && anon && !url.includes("YOURPROJECT"));

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

// Optional: lock sign-in to one email domain (e.g. "people.ai").
export const ALLOWED_DOMAIN = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || "").trim();
