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

// ── Tags ────────────────────────────────────────────────────────────────────
export async function listTags() {
  return unwrap(await supabase.from("tags").select("*").order("name"));
}
export async function createTag(name) {
  return unwrap(await supabase.from("tags").insert({ name }).select().single());
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

// ── Dashboard counts ────────────────────────────────────────────────────────
export async function countRows(table, filter) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}
