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
// An entry is a titled block of knowledge content (pasted text or text extracted
// from an uploaded file), filed under a category and run through the review
// workflow. `title`/`content` replaced the old question/answer pair.
export async function listEntries({ categoryId, status, search } = {}) {
  let q = supabase
    .from("library_entries")
    .select("*, category:category_id(name), updater:updated_by(full_name)")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (status && status !== "all") q = q.eq("status", status);
  if (search) q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  return unwrap(await q);
}
export async function createEntry(fields) {
  return unwrap(await supabase.from("library_entries").insert(fields).select().single());
}
export async function updateEntry(id, fields) {
  return unwrap(await supabase.from("library_entries").update(fields).eq("id", id).select().single());
}

// Library entries (title · content · category) for grounding the drafting API,
// scoping by category, and live match previews. The signed-in client can always
// read this, so we pass it to /api/draft rather than relying on the server key to
// bypass RLS. Mapped to the shared "matchable entry" shape ({ question, answer })
// used across the drafting pool (library + documents + past answers) — here the
// title plays the label role and the content plays the body role.
export async function getLibraryEntries() {
  const data = unwrap(
    await supabase.from("library_entries").select("title, content, category_id, category:category_id(name)").not("content", "is", null).limit(2000)
  );
  return (data || []).map((r) => ({ question: r.title, answer: r.content, category_id: r.category_id, category: r.category }));
}

// Format a set of matchable entries into the grouped text block the drafting
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

// ── Library documents (uploaded certs/policies — the knowledge "brain") ───────
export async function listDocuments() {
  return unwrap(
    await supabase
      .from("library_documents")
      .select("id, name, doc_type, file_type, file_size, created_at, category:category_id(name)")
      .order("created_at", { ascending: false })
      .limit(500)
  );
}
export async function createDocument(fields) {
  return unwrap(await supabase.from("library_documents").insert(fields).select().single());
}
export async function deleteDocument(id) { unwrap(await supabase.from("library_documents").delete().eq("id", id)); }

// Uploaded documents as matchable entries: each doc's text is split into chunks so
// the drafter's per-question matcher can surface only the relevant cert/policy
// excerpts (keeps the prompt small). Grouped under "Source Documents" for provenance.
export async function getDocumentEntries({ chunkChars = 1400, maxChunksPerDoc = 25 } = {}) {
  try {
    const data = unwrap(
      await supabase.from("library_documents").select("name, doc_type, extracted_text").not("extracted_text", "is", null).limit(200)
    );
    const out = [];
    for (const d of data) {
      const text = (d.extracted_text || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const label = `${d.name}${d.doc_type ? ` (${d.doc_type})` : ""}`;
      for (let i = 0, n = 0; i < text.length && n < maxChunksPerDoc; i += chunkChars, n++) {
        out.push({ question: label, answer: text.slice(i, i + chunkChars), category: { name: "Source Documents" }, category_id: null });
      }
    }
    return out;
  } catch { return []; } // table not migrated yet → no documents context
}

// Previously approved/edited answers across projects & templates, as matchable
// entries grouped under "Previously Answered Questions".
export async function getApprovedAnswerEntries({ limit = 500 } = {}) {
  try {
    const data = unwrap(
      await supabase
        .from("project_entries")
        .select("question, edited_answer, status, updated_at")
        .in("status", ["approved", "edited"])
        .not("edited_answer", "is", null)
        .order("updated_at", { ascending: false })
        .limit(limit)
    );
    const seen = new Set();
    const out = [];
    for (const r of data) {
      const key = (r.question || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ question: r.question, answer: r.edited_answer, category: { name: "Previously Answered Questions" }, category_id: null });
    }
    return out;
  } catch { return []; }
}

// The knowledge "brain" beyond the Q&A library: uploaded documents + past answers,
// returned as matchable entries to fold into the drafting pool.
export async function getKnowledgeEntries() {
  const [answers, docs] = await Promise.all([getApprovedAnswerEntries(), getDocumentEntries()]);
  return [...answers, ...docs];
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
  if (search) q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
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

// Open gaps across all projects: questions Claude classified as a "gap" — no real
// answer in the library yet (legacy 'withheld' rows included). Powers the Home
// "Gaps" section so the team can see what knowledge is missing.
export async function listGapEntries({ limit = 50 } = {}) {
  const data = unwrap(
    await supabase
      .from("project_entries")
      .select("id, question, status, flag_type, flag_reason, project_id, project:project_id(name, prospect), updated_at")
      .in("status", ["gap", "withheld"])
      .order("updated_at", { ascending: false })
      .limit(limit)
  );
  return data || [];
}

// Find an existing library entry whose title matches (case-insensitive, exact).
export async function findLibraryEntryByTitle(title) {
  const data = unwrap(await supabase.from("library_entries").select("id, title").ilike("title", title).limit(1));
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
