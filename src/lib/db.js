// Thin data-access helpers over the Supabase client. Every function throws on
// error so callers can try/catch. RLS enforces access; these run as the signed-in user.
import { supabase } from "./supabaseClient.js";

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ── Categories ──────────────────────────────────────────────────────────────
export async function listCategories() {
  return unwrap(
    await supabase
      .from("categories")
      .select("*, reviewer:reviewer_id(full_name), entries:library_entries(count)")
      .order("position", { ascending: true })
  );
}
export async function createCategory(name) {
  return unwrap(await supabase.from("categories").insert({ name }).select().single());
}

// ── Library entries ─────────────────────────────────────────────────────────
export async function listEntries({ categoryId, status, search } = {}) {
  let q = supabase
    .from("library_entries")
    .select("*, category:category_id(name), updater:updated_by(full_name)")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (status && status !== "all") q = q.eq("status", status);
  if (search) q = q.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
  return unwrap(await q);
}
export async function createEntry(fields) {
  return unwrap(await supabase.from("library_entries").insert(fields).select().single());
}
export async function updateEntry(id, fields) {
  return unwrap(await supabase.from("library_entries").update(fields).eq("id", id).select().single());
}

// Structured library entries (question · answer · category) for grounding the
// drafting API, scoping by category, and live match previews. The signed-in
// client can always read this, so we pass it to /api/draft rather than relying
// on the server key to bypass RLS.
export async function getLibraryEntries() {
  const data = unwrap(
    await supabase.from("library_entries").select("question, answer, category_id, category:category_id(name)").not("answer", "is", null).limit(2000)
  );
  return data || [];
}

// Format a set of library entries into the grouped text block the drafting
// prompt expects. Returns null when there's nothing to ground on (caller then
// falls back to the server/bundled library).
export function libraryTextFromEntries(entries) {
  if (!entries?.length) return null;
  const byCat = new Map();
  for (const row of entries) {
    const cat = row.category?.name || "General";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(`**${row.question}**\n${row.answer}`);
  }
  return [...byCat.entries()].map(([c, items]) => `### ${c}\n\n${items.join("\n\n")}`).join("\n\n");
}

// The whole library as a formatted text block (grouped by category).
export async function getLibraryText() {
  return libraryTextFromEntries(await getLibraryEntries());
}

// ── Tags ────────────────────────────────────────────────────────────────────
export async function listTags() {
  return unwrap(await supabase.from("tags").select("*").order("name"));
}
export async function createTag(name) {
  return unwrap(await supabase.from("tags").insert({ name }).select().single());
}
export async function updateTag(id, fields) {
  return unwrap(await supabase.from("tags").update(fields).eq("id", id).select().single());
}

// ── Merge variables ─────────────────────────────────────────────────────────
export async function listMergeVariables() {
  return unwrap(await supabase.from("merge_variables").select("*").order("name"));
}
export async function createMergeVariable(fields) {
  return unwrap(await supabase.from("merge_variables").insert(fields).select().single());
}

// ── Projects ────────────────────────────────────────────────────────────────
export async function listProjects() {
  return unwrap(
    await supabase
      .from("projects")
      .select("*, owner:owner_id(full_name), entries:project_entries(count)")
      .order("created_at", { ascending: false })
  );
}
export async function createProject(fields) {
  return unwrap(await supabase.from("projects").insert(fields).select().single());
}
export async function getProject(id) {
  return unwrap(await supabase.from("projects").select("*").eq("id", id).single());
}
export async function updateProject(id, fields) {
  return unwrap(await supabase.from("projects").update(fields).eq("id", id).select().single());
}
export async function getProjectEntries(projectId) {
  return unwrap(
    await supabase
      .from("project_entries")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true })
  );
}
export async function insertProjectEntries(rows) {
  return unwrap(await supabase.from("project_entries").insert(rows).select());
}
export async function updateProjectEntry(id, fields) {
  return unwrap(await supabase.from("project_entries").update(fields).eq("id", id).select().single());
}
export async function deleteProjectEntry(id) {
  unwrap(await supabase.from("project_entries").delete().eq("id", id));
}

// ── Reviews (filtered query over library entries) ───────────────────────────
export async function listReviews({ categoryId, status, search } = {}) {
  let q = supabase
    .from("library_entries")
    .select("*, category:category_id(name), updater:updated_by(full_name), reviewer:reviewed_by(full_name)")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (categoryId && categoryId !== "all") q = q.eq("category_id", categoryId);
  if (status && status !== "all") q = q.eq("status", status);
  if (search) q = q.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
  return unwrap(await q);
}

// ── Reviews from Projects (the repo of answered questionnaire entries) ───────
export async function listProjectReviews({ projectId, search } = {}) {
  let q = supabase
    .from("project_entries")
    .select("*, project:project_id(name, prospect), section:section_id(name)")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (projectId && projectId !== "all") q = q.eq("project_id", projectId);
  if (search) q = q.or(`question.ilike.%${search}%,edited_answer.ilike.%${search}%,draft_answer.ilike.%${search}%`);
  return unwrap(await q);
}

// Find an existing library entry whose question matches (case-insensitive, exact).
export async function findLibraryEntryByQuestion(question) {
  const data = unwrap(await supabase.from("library_entries").select("id, question").ilike("question", question).limit(1));
  return data?.[0] || null;
}

// ── Dashboard counts ────────────────────────────────────────────────────────
export async function countRows(table, filter) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ── Delete / update CRUD ─────────────────────────────────────────────────────
export async function deleteProject(id) { unwrap(await supabase.from("projects").delete().eq("id", id)); }
export async function deleteEntry(id) { unwrap(await supabase.from("library_entries").delete().eq("id", id)); }
export async function updateCategory(id, fields) { return unwrap(await supabase.from("categories").update(fields).eq("id", id).select().single()); }
export async function deleteCategory(id) { unwrap(await supabase.from("categories").delete().eq("id", id)); }
export async function updateMergeVariable(id, fields) { return unwrap(await supabase.from("merge_variables").update(fields).eq("id", id).select().single()); }
export async function deleteMergeVariable(id) { unwrap(await supabase.from("merge_variables").delete().eq("id", id)); }
export async function deleteTag(id) { unwrap(await supabase.from("tags").delete().eq("id", id)); }

// ── Prospects (managed in Settings) ──────────────────────────────────────────
export async function listProspects() { return unwrap(await supabase.from("prospects").select("*").order("name")); }
export async function createProspect(name) { return unwrap(await supabase.from("prospects").insert({ name }).select().single()); }
export async function updateProspect(id, fields) { return unwrap(await supabase.from("prospects").update(fields).eq("id", id).select().single()); }
export async function deleteProspect(id) { unwrap(await supabase.from("prospects").delete().eq("id", id)); }

// ── Profiles (team members, for Settings/assignees) ──────────────────────────
export async function listProfiles() { return unwrap(await supabase.from("profiles").select("id, full_name, email").order("full_name")); }
