import { useEffect, useState } from "react";
import { C } from "../../lib/theme.js";
import { listProjectReviews, listProjects, listCategories, createEntry, updateEntry, updateProjectEntry, findLibraryEntryByQuestion } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Select, Input } from "../../components/ui.jsx";
import { IconBook } from "../../components/icons.jsx";

// Reviews → From Projects: the repo of every answer drafted/edited in a project,
// where a reviewer curates each Q&A into the Library.
export default function FromProjects() {
  const [rows, setRows] = useState(null);
  const [projects, setProjects] = useState([]);
  const [cats, setCats] = useState([]);
  const [filters, setFilters] = useState({ projectId: "all", search: "", show: "all" });
  const [acted, setActed] = useState({}); // entryId -> { kind, msg }
  const [err, setErr] = useState(null);

  useEffect(() => {
    listProjects().then(setProjects).catch(() => {});
    listCategories().then(setCats).catch(() => {});
  }, []);

  function load() {
    setRows(null);
    listProjectReviews({ projectId: filters.projectId, search: filters.search }).then(setRows).catch((e) => setErr(e.message));
  }
  useEffect(load, [filters.projectId]);

  function mark(id, kind, msg) { setActed((a) => ({ ...a, [id]: { kind, msg } })); }

  async function addAsNew(entry, categoryId) {
    try {
      await createEntry({ category_id: categoryId || null, question: entry.question, answer: entry.edited_answer || entry.draft_answer, status: "never_reviewed", tags: [] });
      mark(entry.id, "added", "Added as a new library entry");
    } catch (e) { setErr(e.message); }
  }
  async function updateLibrary(entry, categoryId) {
    try {
      const match = await findLibraryEntryByQuestion(entry.question);
      if (match) await updateEntry(match.id, { answer: entry.edited_answer || entry.draft_answer, status: "approved_with_edits" });
      else await createEntry({ category_id: categoryId || null, question: entry.question, answer: entry.edited_answer || entry.draft_answer, status: "approved_with_edits" });
      mark(entry.id, "updated", match ? "Updated the existing library entry" : "No match found — added as new");
    } catch (e) { setErr(e.message); }
  }
  function dismiss(entry) { mark(entry.id, "dismissed", "Won't be added to the library"); }
  async function saveEdit(entry, text) {
    try { await updateProjectEntry(entry.id, { edited_answer: text }); load(); } catch (e) { setErr(e.message); }
  }

  const visible = (rows || []).filter((r) => {
    if (filters.show === "pending" && acted[r.id]) return false;
    return true;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 24 }}>
      {/* Left filter rail */}
      <aside>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.body, marginBottom: 14 }}>Reviews from Projects</div>
        <Rail label="Filter by">
          <Select value={filters.show} onChange={(e) => setFilters({ ...filters, show: e.target.value })}>
            <option value="all">All Entries</option>
            <option value="pending">Not yet reviewed</option>
          </Select>
        </Rail>
        <Rail label="Project">
          <Select value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}>
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Rail>
        <Rail label="Search">
          <div style={{ display: "flex", gap: 6 }}>
            <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Question or answer…" />
            <Button onClick={load} style={{ whiteSpace: "nowrap", padding: "8px 12px" }}>Go</Button>
          </div>
        </Rail>
      </aside>

      {/* Main list */}
      <div>
        <PageHeader title="Reviews" subtitle="Curate answers from your projects into the reusable library." />
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        {rows == null ? <Spinner /> : visible.length === 0 ? (
          <Empty title="There are no Reviews matching your current filters" hint="Answer some questions in a Project, then they show up here to add to the library." />
        ) : (
          <>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{visible.length} of {rows.length} entries</div>
            {visible.map((entry) => (
              <ReviewCard key={entry.id} entry={entry} cats={cats} acted={acted[entry.id]} onAddNew={addAsNew} onUpdate={updateLibrary} onDismiss={dismiss} onSaveEdit={saveEdit} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Rail({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ReviewCard({ entry, cats, acted, onAddNew, onUpdate, onDismiss, onSaveEdit }) {
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.edited_answer || entry.draft_answer || "");
  const answer = entry.edited_answer || entry.draft_answer;
  const btn = { fontSize: 12, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", background: "#fff", color: C.body, fontFamily: "inherit" };

  return (
    <div style={{ border: `1px solid ${C.cardLine}`, borderRadius: 14, background: "#fff", marginBottom: 14, overflow: "hidden" }}>
      <div style={{ background: "#F6F5FB", padding: "14px 18px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 14.5, fontWeight: 650, color: C.ink, lineHeight: 1.45 }}>{entry.question}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconBook /> {entry.project?.name || "Project"}{entry.section?.name ? ` / ${entry.section.name}` : ""}</span>
          {entry.flag && <span style={{ background: C.tan, color: C.tanInk, borderRadius: 6, padding: "1px 7px", fontWeight: 600 }}>{entry.flag_type || "Flagged"}</span>}
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        {editing ? (
          <div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ width: "100%", minHeight: 120, fontSize: 13.5, lineHeight: 1.7, padding: "10px 12px", borderRadius: 9, border: `1px solid ${C.blueSoft}`, boxSizing: "border-box", fontFamily: "inherit", color: C.body }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button variant="primary" onClick={() => { onSaveEdit(entry, text); setEditing(false); }} style={{ padding: "6px 14px" }}>Save</Button>
              <Button onClick={() => { setText(answer || ""); setEditing(false); }} style={{ padding: "6px 14px" }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: C.body, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {answer || <span style={{ color: C.faint, fontStyle: "italic" }}>No answer drafted</span>}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: C.faint, marginTop: 12 }}>
          Suggested from <strong>{entry.project?.name}</strong>{entry.project?.prospect ? ` · ${entry.project.prospect}` : ""} · updated {entry.updated_at?.slice(0, 10)}
        </div>

        {acted ? (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 13, fontWeight: 600, color: acted.kind === "dismissed" ? C.muted : "#15803D" }}>
            {acted.kind === "dismissed" ? "✕ " : "✓ "}{acted.msg}
          </div>
        ) : !editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.muted }}>Library location</span>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: "auto", fontSize: 12, padding: "5px 8px" }}>
              <option value="">No Category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onDismiss(entry)} style={btn}>Do not add to Library</button>
              <button onClick={() => setEditing(true)} style={btn}>Edit Entry</button>
              <button onClick={() => onAddNew(entry, categoryId)} style={{ ...btn, borderColor: "#BBE7CB", background: C.greenSoft, color: "#15803D", fontWeight: 600 }}>Add as New Entry</button>
              <button onClick={() => onUpdate(entry, categoryId)} style={{ ...btn, background: C.blue, color: "#fff", border: `1px solid ${C.blue}`, fontWeight: 600 }}>Update Library Entry</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
