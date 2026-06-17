import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { C, STATUS_DOT, STATUS_LABEL } from "../../lib/theme.js";
import { listEntries, listCategories, createEntry, updateEntry, deleteEntry } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input, Select, StatusDot } from "../../components/ui.jsx";

const STATUSES = ["never_reviewed", "unassigned", "assigned", "approved_with_edits", "approved_without_edits"];

export default function Category() {
  const { id } = useParams();
  const [entries, setEntries] = useState(null);
  const [cat, setCat] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ question: "", answer: "" });

  function load() {
    listEntries({ categoryId: id }).then(setEntries).catch((e) => setErr(e.message));
    listCategories().then((cs) => setCat(cs.find((c) => c.id === id))).catch(() => {});
  }
  useEffect(load, [id]);

  async function add() {
    if (!draft.question.trim()) return;
    try {
      await createEntry({ category_id: id, question: draft.question, answer: draft.answer, status: "never_reviewed" });
      setDraft({ question: "", answer: "" });
      setAdding(false);
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader
        title={cat?.name || "Category"}
        subtitle={entries ? `${entries.length} entries` : ""}
        actions={<Button variant="primary" onClick={() => setAdding(true)}>+ Add Entry</Button>}
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {entries == null ? <Spinner /> : entries.length === 0 ? (
        <Empty title="No entries in this category yet" hint="Add an entry, or import your library." />
      ) : (
        entries.map((e) => <EntryRow key={e.id} entry={e} onChanged={load} onError={setErr} />)
      )}

      {adding && (
        <Modal title="Add Library Entry" onClose={() => setAdding(false)} width={620}>
          <Field label="Question"><Input value={draft.question} onChange={(ev) => setDraft({ ...draft, question: ev.target.value })} autoFocus /></Field>
          <Field label="Answer">
            <textarea value={draft.answer} onChange={(ev) => setDraft({ ...draft, answer: ev.target.value })} style={ta} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={add}>Create</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const ta = { width: "100%", minHeight: 140, fontSize: 13, lineHeight: 1.6, padding: "10px 12px", borderRadius: 9, border: `1px solid #D7DEE9`, boxSizing: "border-box", fontFamily: "inherit", color: "#3A3F4B" };
const iconBtn = { fontSize: 11.5, padding: "5px 11px", borderRadius: 7, border: `1px solid ${C.line}`, background: "#fff", color: C.body, cursor: "pointer", fontFamily: "inherit" };

function EntryRow({ entry, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(entry.question);
  const [a, setA] = useState(entry.answer || "");

  async function save() {
    try { await updateEntry(entry.id, { question: q, answer: a }); setEditing(false); onChanged(); } catch (e) { onError(e.message); }
  }
  async function setStatus(status) {
    try { await updateEntry(entry.id, { status, ...(status.startsWith("approved") ? { reviewed_at: new Date().toISOString() } : {}) }); onChanged(); } catch (e) { onError(e.message); }
  }
  async function remove() {
    if (!confirm("Delete this library entry?")) return;
    try { await deleteEntry(entry.id); onChanged(); } catch (e) { onError(e.message); }
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
      {editing ? (
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Question</div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Answer</div>
          <textarea value={a} onChange={(e) => setA(e.target.value)} style={{ ...ta, borderColor: C.blueSoft }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={save}>Save</Button>
            <Button onClick={() => { setQ(entry.question); setA(entry.answer || ""); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 6 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, lineHeight: 1.45 }}>{entry.question}</div>
            <Select value={entry.status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto", fontSize: 11.5, padding: "4px 8px", flexShrink: 0 }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </div>
          <div style={{ fontSize: 13.5, color: C.body, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{entry.answer || <span style={{ color: C.faint, fontStyle: "italic" }}>No answer yet</span>}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.faint }}>
              <StatusDot color={STATUS_DOT[entry.status]} /> Updated {entry.updated_at?.slice(0, 10)}{entry.updater?.full_name ? ` · ${entry.updater.full_name}` : ""}
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
