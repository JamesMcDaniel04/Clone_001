import { useEffect, useState } from "react";
import { C } from "../../lib/theme.js";
import { listTags, createTag, updateTag, deleteTag } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Input, Modal, Field } from "../../components/ui.jsx";

export default function Tags() {
  const [tags, setTags] = useState(null);
  const [err, setErr] = useState(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  function load() { listTags().then(setTags).catch((e) => setErr(e.message)); }
  useEffect(load, []);

  async function add() {
    if (!name.trim()) return;
    try { await createTag(name.trim()); setName(""); load(); } catch (e) { setErr(e.message); }
  }
  async function remove(t) {
    if (!confirm(`Delete tag "${t.name}"?`)) return;
    try { await deleteTag(t.id); load(); } catch (e) { setErr(e.message); }
  }
  async function save(t) {
    if (!t.name.trim()) return;
    try { await updateTag(t.id, { name: t.name.trim() }); setEditing(null); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader title="Tags" subtitle="Label library entries to group and filter them across categories." />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 420 }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="primary" onClick={add} style={{ whiteSpace: "nowrap" }}>Add Tag</Button>
      </div>

      {tags == null ? <Spinner /> : tags.length === 0 ? (
        <Empty title="No tags yet" />
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map((t) => (
            <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#4B5563", border: "1px solid #E5E7EB", borderRadius: 8, padding: "5px 8px 5px 12px", fontSize: 12.5, fontWeight: 500 }}>
              {t.name}
              <button onClick={() => setEditing(t)} title="Edit tag" style={{ border: "none", background: "transparent", color: C.blueInk, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>Edit</button>
              <button onClick={() => remove(t)} title="Delete tag" style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      {editing && <EditTagModal tag={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function EditTagModal({ tag, onClose, onSave }) {
  const [d, setD] = useState(tag);
  return (
    <Modal title="Edit Tag" onClose={onClose}>
      <Field label="Tag name"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus /></Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>Save</Button>
      </div>
    </Modal>
  );
}
