// Server-side Supabase access for the drafting API. Uses the service-role key
// (never exposed to the browser) to read the live answer library so Claude drafts
// against the real ~1,200 entries instead of a static doc.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  url && serviceKey && !url.includes("YOURPROJECT")
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;

// Returns the library as a formatted text block grouped by category, or null if
// Supabase isn't configured / has no entries (caller falls back to the bundled lib).
export async function getDbLibrary() {
  if (!supabaseAdmin) return null;
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
