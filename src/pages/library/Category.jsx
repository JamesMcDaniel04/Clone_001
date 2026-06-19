import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { C, STATUS_DOT, STATUS_LABEL } from "../../lib/theme.js";
import { listEntries, listCategories, createEntry, updateEntry, deleteEntry } from "../../lib/db.js";
import { fileKind, readPdf, readDocx, readTextFile } from "../../lib/importParsers.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input, Select, StatusDot } from "../../components/ui.jsx";

const STATUSES = ["never_reviewed", "unassigned", "assigned", "approved_with_edits", "approved_without_edits"];

async function extractText(file) {
  const kind = fileKind(file.name);
  if (kind === "pdf") return await readPdf(file);
  if (kind === "docx") return await readDocx(file);
  if (kind === "text") return await readTextFile(file); // .txt and .md
  throw new Error("Unsupported file — upload a .pdf, .docx, .txt, or .md.");
}

export default function Category() {
  const { id } = useParams();
  const [entries, setEntries] = useState(null);
  const [cat, setCat] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);

  function load() {
    listEntries({ categoryId: id }).then(setEntries).catch((e) => setErr(e.message));
    listCategories().then((cs) => setCat(cs.find((c) => c.id === id))).catch(() => {});
  }
  useEffect(load, [id]);

  async function add(d) {
    try {
      await createEntry({
        category_id: id,
        title: d.title.trim(),
        content: d.content,
        source_type: d.source_type,
        file_type: d.file_type || null,
        file_size: d.file_size || null,
        status: "never_reviewed",
      });
      setAdding(false);
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader
        title={cat?.name || "Category"}
        subtitle={entries ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}` : ""}
        actions={<Button variant="primary" onClick={() => setAdding(true)}>+ Add Content</Button>}
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {entries == null ? <Spinner /> : entries.length === 0 ? (
        <Empty title="No content in this category yet" hint="Paste text or upload a .pdf, .docx, .txt, or .md file to add knowledge here." />
      ) : (
        entries.map((e) => <EntryRow key={e.id} entry={e} onChanged={load} onError={setErr} />)
      )}

      {adding && <AddModal onClose={() => setAdding(false)} onSave={add} onError={setErr} />}
    </div>
  );
}

const ta = { width: "100%", minHeight: 200, fontSize: 13, lineHeight: 1.6, padding: "10px 12px", borderRadius: 9, border: `1px solid #D7DEE9`, boxSizing: "border-box", fontFamily: "inherit", color: "#3A3F4B" };
const iconBtn = { fontSize: 11.5, padding: "5px 11px", borderRadius: 7, border: `1px solid ${C.line}`, background: "#fff", color: C.body, cursor: "pointer", fontFamily: "inherit" };
const fmtSize = (n) => (n ? `${(n / 1024).toFixed(n > 1024 * 100 ? 0 : 1)} KB` : "");

// Add content: paste text, or upload a file whose text is extracted. No more
// question/answer fields — an entry is just a titled block of knowledge content.
function AddModal({ onClose, onSave, onError }) {
  const [mode, setMode] = useState("text"); // "text" | "file"
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null); // { file_type, file_size }
  const [busy, setBusy] = useState(false);

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    onError(null); setBusy(true);
    try {
      const text = (await extractText(f)).trim();
      if (!text) throw new Error("No text could be extracted from this file.");
      setContent(text);
      setFile({ file_type: fileKind(f.name), file_size: f.size });
      if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
    } catch (e2) { onError(e2.message); }
    finally { setBusy(false); }
  }

  function save() {
    if (!title.trim() || !content.trim()) return;
    onSave(
      mode === "file" && file
        ? { title, content, source_type: "file", file_type: file.file_type, file_size: file.file_size }
        : { title, content, source_type: "text" }
    );
  }

  return (
    <Modal title="Add Library Content" onClose={onClose} width={640}>
      <div style={{ display: "inline-flex", gap: 4, padding: 3, background: C.panel, borderRadius: 9, marginBottom: 16 }}>
        {[["text", "Paste text"], ["file", "Upload file"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            fontSize: 12.5, fontWeight: 600, padding: "6px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", border: "none",
            background: mode === m ? "#fff" : "transparent", color: mode === m ? C.ink : C.muted,
            boxShadow: mode === m ? "0 1px 2px rgba(16,24,40,0.08)" : "none",
          }}>{label}</button>
        ))}
      </div>

      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Data retention policy" /></Field>

      {mode === "text" ? (
        <Field label="Content">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} style={ta} placeholder="Paste the text you want the AI drafter to ground on…" />
        </Field>
      ) : (
        <Field label="File">
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, padding: "22px 16px", borderRadius: 10, cursor: "pointer", background: C.panel, color: C.body, border: `1.5px dashed ${C.cardLine}`, fontFamily: "inherit" }}>
            {busy ? "Reading…" : file ? "Replace file (.pdf, .docx, .txt, .md)" : "Choose a file (.pdf, .docx, .txt, .md)"}
            <input type="file" accept=".pdf,.docx,.txt,.md" onChange={onFile} disabled={busy} style={{ display: "none" }} />
          </label>
          {file && (
            <div style={{ fontSize: 12.5, color: "#15803D", background: C.greenSoft, border: "1px solid #BBE7CB", borderRadius: 8, padding: "7px 11px", marginTop: 10 }}>
              Extracted {content.length.toLocaleString()} characters from your {file.file_type.toUpperCase()}{file.file_size ? ` · ${fmtSize(file.file_size)}` : ""}.
            </div>
          )}
        </Field>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={busy || !title.trim() || !content.trim()} onClick={save}>Create</Button>
      </div>
    </Modal>
  );
}

function EntryRow({ entry, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || "");

  async function save() {
    try { await updateEntry(entry.id, { title, content }); setEditing(false); onChanged(); } catch (e) { onError(e.message); }
  }
  async function setStatus(status) {
    try { await updateEntry(entry.id, { status, ...(status.startsWith("approved") ? { reviewed_at: new Date().toISOString() } : {}) }); onChanged(); } catch (e) { onError(e.message); }
  }
  async function remove() {
    if (!confirm("Delete this library entry?")) return;
    try { await deleteEntry(entry.id); onChanged(); } catch (e) { onError(e.message); }
  }

  const meta = [entry.source_type === "file" ? "File" : "Pasted text", (entry.file_type || "").toUpperCase(), entry.file_size ? fmtSize(entry.file_size) : ""].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
      {editing ? (
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Title</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Content</div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} style={{ ...ta, borderColor: C.blueSoft }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={save}>Save</Button>
            <Button onClick={() => { setTitle(entry.title); setContent(entry.content || ""); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 6 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, lineHeight: 1.45 }}>{entry.title}</div>
            <Select value={entry.status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto", fontSize: 11.5, padding: "4px 8px", flexShrink: 0 }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </div>
          <div style={{ fontSize: 13.5, color: C.body, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{entry.content || <span style={{ color: C.faint, fontStyle: "italic" }}>No content yet</span>}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.faint }}>
              <StatusDot color={STATUS_DOT[entry.status]} /> {meta} · Updated {entry.updated_at?.slice(0, 10)}{entry.updater?.full_name ? ` · ${entry.updater.full_name}` : ""}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditing(true)} style={iconBtn}>Edit</button>
              <button onClick={remove} style={{ ...iconBtn, color: C.red, borderColor: C.redSoft }}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
