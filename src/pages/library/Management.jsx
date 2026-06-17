import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../lib/theme.js";
import { listCategories, createCategory, updateCategory, deleteCategory, listProfiles } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Modal, Field, Input, Select } from "../../components/ui.jsx";

export default function Management() {
  const nav = useNavigate();
  const [cats, setCats] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (new) | row (edit)

  function load() { listCategories().then(setCats).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); listProfiles().then(setProfiles).catch(() => {}); }, []);

  async function save(d) {
    try {
      const fields = { name: d.name, next_review_cycle: d.next_review_cycle || null, reviewer_id: d.reviewer_id || null };
      if (d.id) await updateCategory(d.id, fields);
      else await createCategory(d.name);
      setEditing(null);
      load();
    } catch (e) { setErr(e.message); }
  }
  async function remove(c) {
    if (!confirm(`Delete category "${c.name}"? Entries in it become uncategorized (not deleted).`)) return;
    try { await deleteCategory(c.id); load(); } catch (e) { setErr(e.message); }
  }

  const total = cats?.reduce((n, c) => n + (c.entries?.[0]?.count ?? 0), 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Library Management"
        subtitle={cats ? `Default · ${total} entries` : "Default"}
        actions={<Button variant="primary" onClick={() => setEditing({ name: "" })}>+ Add Category</Button>}
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {cats == null ? <Spinner /> : (
        <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 150px 150px 130px", gap: 12, padding: "11px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.muted, fontWeight: 600 }}>
            <div>Category</div><div>Entries</div><div>Next Review</div><div>Reviewer</div><div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {cats.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 150px 150px 130px", gap: 12, padding: "13px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 13.5, alignItems: "center", color: C.ink }}>
              <div onClick={() => nav(`/library/category/${c.id}`)} style={{ color: C.blueInk, fontWeight: 500, cursor: "pointer" }}>{c.name}</div>
              <div>{c.entries?.[0]?.count ?? 0}</div>
              <div style={{ color: C.muted }}>{c.next_review_cycle || "—"}</div>
              <div style={{ color: C.muted }}>{c.reviewer?.full_name || "—"}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => setEditing(c)} style={iconBtn}>Edit</button>
                <button onClick={() => remove(c)} style={{ ...iconBtn, color: C.red, borderColor: C.redSoft }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <EditModal initial={editing} profiles={profiles} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

const iconBtn = { fontSize: 11.5, padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.line}`, background: "#fff", color: C.body, cursor: "pointer", fontFamily: "inherit" };

function EditModal({ initial, profiles, onClose, onSave }) {
  const [d, setD] = useState({ ...initial, reviewer_id: initial.reviewer_id || "", next_review_cycle: initial.next_review_cycle || "" });
  return (
    <Modal title={initial.id ? "Edit Category" : "Add Category"} onClose={onClose}>
      <Field label="Category name"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus placeholder="e.g. InfoSec" /></Field>
      {initial.id && (
        <>
          <Field label="Next review cycle"><Input type="date" value={d.next_review_cycle || ""} onChange={(e) => setD({ ...d, next_review_cycle: e.target.value })} /></Field>
          <Field label="Reviewer">
            <Select value={d.reviewer_id || ""} onChange={(e) => setD({ ...d, reviewer_id: e.target.value })}>
              <option value="">Unassigned</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </Select>
          </Field>
        </>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>{initial.id ? "Save" : "Create"}</Button>
      </div>
    </Modal>
  );
}
