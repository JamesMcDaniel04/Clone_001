import { useEffect, useState } from "react";
import { C } from "../../lib/theme.js";
import { listMergeVariables, createMergeVariable, updateMergeVariable, deleteMergeVariable } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input } from "../../components/ui.jsx";

const BLANK = { name: "", type: "Project", value: "", comment: "" };

export default function MergeVariables() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (new) | row (edit)

  function load() { listMergeVariables().then(setRows).catch((e) => setErr(e.message)); }
  useEffect(load, []);

  async function save(draft) {
    try {
      if (draft.id) await updateMergeVariable(draft.id, { name: draft.name, type: draft.type, value: draft.value, comment: draft.comment });
      else await createMergeVariable({ name: draft.name, type: draft.type, value: draft.value, comment: draft.comment });
      setEditing(null);
      load();
    } catch (e) { setErr(e.message); }
  }
  async function remove(row) {
    if (!confirm(`Delete merge variable "${row.name}"?`)) return;
    try { await deleteMergeVariable(row.id); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader
        title="Merge Variables"
        subtitle="Reusable [[tokens]] you drop into answers — update once, applied everywhere."
        actions={<Button variant="primary" onClick={() => setEditing({ ...BLANK })}>+ Add Merge Variable</Button>}
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {rows == null ? <Spinner /> : rows.length === 0 ? (
        <Empty title="No merge variables yet" />
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1.1fr 70px 1.4fr 120px", gap: 12, padding: "11px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.muted, fontWeight: 600 }}>
            <div>Variable Name</div><div>Type</div><div>Value</div><div>Used</div><div>Comments</div><div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1.1fr 70px 1.4fr 120px", gap: 12, padding: "12px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 13, alignItems: "center", color: C.body }}>
              <div style={{ fontWeight: 500, color: C.ink }}>{r.name}</div>
              <div style={{ color: C.muted }}>{r.type}</div>
              <div style={{ color: C.muted }}>{r.value || "—"}</div>
              <div style={{ color: C.muted }}>{r.times_used ?? 0}</div>
              <div style={{ color: C.muted, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.comment || "—"}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => setEditing(r)} style={iconBtn}>Edit</button>
                <button onClick={() => remove(r)} style={{ ...iconBtn, color: C.red, borderColor: C.redSoft }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <EditModal initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

const iconBtn = { fontSize: 11.5, padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.line}`, background: "#fff", color: C.body, cursor: "pointer", fontFamily: "inherit" };

function EditModal({ initial, onClose, onSave }) {
  const [d, setD] = useState(initial);
  return (
    <Modal title={initial.id ? "Edit Merge Variable" : "Add Merge Variable"} onClose={onClose}>
      <Field label="Variable name"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus placeholder="Client Name" /></Field>
      <Field label="Type"><Input value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })} placeholder="Project / Static" /></Field>
      <Field label="Value"><Input value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} placeholder="(blank for Project-type)" /></Field>
      <Field label="Comments / Instructions"><Input value={d.comment} onChange={(e) => setD({ ...d, comment: e.target.value })} /></Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>{initial.id ? "Save" : "Create"}</Button>
      </div>
    </Modal>
  );
}
