import { useEffect, useState } from "react";
import { C } from "../../lib/theme.js";
import { listTags, createTag, renameTag, deleteTag, listTagUsage } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Input, Modal, Field } from "../../components/ui.jsx";

export default function Tags() {
  const [tags, setTags] = useState(null);
  const [usage, setUsage] = useState({});
  const [err, setErr] = useState(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  function load() {
    listTags().then(setTags).catch((e) => setErr(e.message));
    listTagUsage().then(setUsage).catch(() => setUsage({}));
  }
  useEffect(load, []);

  async function add() {
    const clean = name.trim();
    if (!clean) return;
    setErr(null);
    if ((tags || []).some((t) => t.name.toLowerCase() === clean.toLowerCase())) {
      setErr(`Tag "${clean}" already exists.`);
      return;
    }
    try { await createTag(clean); setName(""); load(); } catch (e) { setErr(e.message); }
  }
  async function remove(t) {
    const n = usage[t.name] || 0;
    const warning = n > 0
      ? `Delete tag "${t.name}"? It will be removed from ${n} ${n === 1 ? "entry" : "entries"}.`
      : `Delete tag "${t.name}"?`;
    if (!confirm(warning)) return;
    try { await deleteTag(t.id, t.name); load(); } catch (e) { setErr(e.message); }
  }
  async function save(t) {
    const clean = t.name.trim();
    if (!clean) return;
    setErr(null);
    if ((tags || []).some((x) => x.id !== t.id && x.name.toLowerCase() === clean.toLowerCase())) {
      setErr(`Tag "${clean}" already exists.`);
      return;
    }
    try { await renameTag(t.id, editing.name, clean); setEditing(null); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader title="Tags" subtitle="Label library entries to group, filter, and scope drafting across categories." />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 420 }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="primary" onClick={add} style={{ whiteSpace: "nowrap" }}>Add Tag</Button>
      </div>

      {tags == null ? <Spinner /> : tags.length === 0 ? (
        <Empty title="No tags yet" />
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map((t) => {
            const n = usage[t.name] || 0;
            return (
              <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#4B5563", border: "1px solid #E5E7EB", borderRadius: 8, padding: "5px 8px 5px 12px", fontSize: 12.5, fontWeight: 500 }}>
                {t.name}
                <span title={`${n} ${n === 1 ? "entry" : "entries"}`} style={{ fontSize: 11, color: C.muted, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: "1px 6px", fontWeight: 600 }}>{n}</span>
                <button onClick={() => setEditing(t)} title="Edit tag" style={{ border: "none", background: "transparent", color: C.blueInk, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>Edit</button>
                <button onClick={() => remove(t)} title="Delete tag" style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            );
          })}
        </div>
      )}
      {editing && <EditTagModal tag={editing} usage={usage[editing.name] || 0} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function EditTagModal({ tag, usage, onClose, onSave }) {
  const [d, setD] = useState(tag);
  return (
    <Modal title="Edit Tag" onClose={onClose}>
      <Field label="Tag name"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus /></Field>
      {usage > 0 && (
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: -6, marginBottom: 14 }}>
          Renaming updates this tag on {usage} {usage === 1 ? "entry" : "entries"}.
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>Save</Button>
      </div>
    </Modal>
  );
}
