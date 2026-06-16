import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { C, STATUS_DOT, STATUS_LABEL } from "../../lib/theme.js";
import { listEntries, listCategories, createEntry, updateEntry } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input, StatusDot } from "../../components/ui.jsx";

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
    } catch (e) {
      setErr(e.message);
    }
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
        entries.map((e) => <EntryRow key={e.id} entry={e} onSaved={load} />)
      )}

      {adding && (
        <Modal title="Add Library Entry" onClose={() => setAdding(false)} width={620}>
          <Field label="Question"><Input value={draft.question} onChange={(ev) => setDraft({ ...draft, question: ev.target.value })} autoFocus /></Field>
          <Field label="Answer">
            <textarea value={draft.answer} onChange={(ev) => setDraft({ ...draft, answer: ev.target.value })} style={{ width: "100%", minHeight: 140, fontSize: 13, lineHeight: 1.6, padding: "10px 12px", borderRadius: 9, border: `1px solid ${C.line}`, boxSizing: "border-box", fontFamily: "inherit", color: C.body }} />
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

function EntryRow({ entry, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(entry.answer || "");

  async function save() {
    await updateEntry(entry.id, { answer });
    setEditing(false);
    onSaved();
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 6 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, lineHeight: 1.45 }}>{entry.question}</div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
          <StatusDot color={STATUS_DOT[entry.status]} /> {STATUS_LABEL[entry.status]}
        </span>
      </div>
      {editing ? (
        <div>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ width: "100%", minHeight: 120, fontSize: 13.5, lineHeight: 1.7, padding: "10px 12px", borderRadius: 9, border: `1px solid ${C.blueSoft}`, boxSizing: "border-box", fontFamily: "inherit", color: C.body }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={save}>Save</Button>
            <Button onClick={() => { setAnswer(entry.answer || ""); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, color: C.body, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{entry.answer || <span style={{ color: C.faint, fontStyle: "italic" }}>No answer yet</span>}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 11.5, color: C.faint }}>Updated {entry.updated_at?.slice(0, 10)}{entry.updater?.full_name ? ` · ${entry.updater.full_name}` : ""}</span>
            <Button onClick={() => setEditing(true)} style={{ padding: "5px 12px", fontSize: 12 }}>Edit</Button>
          </div>
        </>
      )}
    </div>
  );
}
