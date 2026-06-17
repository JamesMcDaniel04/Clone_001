// Server-side Supabase access for the drafting API. Prefer a secret/service-role
// key, but allow the public browser key in local/shared-workspace mode by creating
// an anonymous server session before reading RLS-protected tables.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const usesPublishableKey = key?.startsWith("sb_publishable") || key === process.env.VITE_SUPABASE_ANON_KEY || key === process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let anonSessionReady = false;

export const supabaseAdmin =
  url && key && !url.includes("YOURPROJECT")
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

async function ensureServerSession() {
  if (!supabaseAdmin || !usesPublishableKey || anonSessionReady) return;
  const { error } = await supabaseAdmin.auth.signInAnonymously();
  if (error) throw error;
  anonSessionReady = true;
}

// Returns the library as a formatted text block grouped by category, or null if
// Supabase isn't configured / has no entries (caller falls back to the bundled lib).
export async function getDbLibrary() {
  if (!supabaseAdmin) return null;
  try { await ensureServerSession(); } catch { return null; }
  const { data, error } = await supabaseAdmin
    .from("library_entries")
    .select("question, answer, category:category_id(name)")
    .not("answer", "is", null)
    .limit(2000);
  if (error || !data || data.length === 0) return null;

  const byCategory = new Map();
  for (const row of data) {
    const cat = row.category?.name || "General";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(`**${row.question}**\n${row.answer}`);
  }
  return [...byCategory.entries()]
    .map(([cat, items]) => `### ${cat}\n\n${items.join("\n\n")}`)
    .join("\n\n");
}
