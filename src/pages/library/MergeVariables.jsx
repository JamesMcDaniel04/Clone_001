import { useEffect, useState } from "react";
import { C } from "../../lib/theme.js";
import { listMergeVariables, createMergeVariable, updateMergeVariable, deleteMergeVariable, mergeVariableUsage } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input, Select } from "../../components/ui.jsx";

const BLANK = { name: "", type: "Project", value: "", comment: "" };
const TYPES = ["Project", "Static"];

export default function MergeVariables() {
  const [rows, setRows] = useState(null);
  const [usage, setUsage] = useState({});
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (new) | row (edit)

  function load() {
    listMergeVariables()
      .then((vars) => {
        setRows(vars);
        mergeVariableUsage(vars).then(setUsage).catch(() => setUsage({}));
      })
      .catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function save(draft) {
    const name = draft.name.trim();
    setErr(null);
    // Case-insensitive duplicate guard (the resolver treats names case-insensitively).
    if ((rows || []).some((r) => r.id !== draft.id && r.name.trim().toLowerCase() === name.toLowerCase())) {
      setErr(`A merge variable named "${name}" already exists.`);
      return;
    }
    if (draft.type === "Static" && !draft.value.trim()) {
      setErr("Static variables need a value.");
      return;
    }
    const fields = { name, type: draft.type, value: draft.type === "Project" ? "" : draft.value.trim(), comment: draft.comment };
    try {
      if (draft.id) await updateMergeVariable(draft.id, fields);
      else await createMergeVariable(fields);
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
        subtitle="Reusable [[tokens]] you drop into answers — update once, applied everywhere. Names match case- and spacing-insensitively."
        actions={<Button variant="primary" onClick={() => setEditing({ ...BLANK })}>+ Add Merge Variable</Button>}
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {rows == null ? <Spinner /> : rows.length === 0 ? (
        <Empty title="No merge variables yet" />
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1.1fr 80px 1.4fr 120px", gap: 12, padding: "11px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.muted, fontWeight: 600 }}>
            <div>Variable Name</div><div>Type</div><div>Value</div><div>Used in</div><div>Comments</div><div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {rows.map((r) => {
            const n = usage[r.name] ?? 0;
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1.1fr 80px 1.4fr 120px", gap: 12, padding: "12px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 13, alignItems: "center", color: C.body }}>
                <div style={{ fontWeight: 500, color: C.ink }}><code style={{ fontSize: 12, color: C.blueInk }}>[[{r.name}]]</code></div>
                <div style={{ color: C.muted }}>{r.type}</div>
                <div style={{ color: C.muted }}>{r.type === "Project" ? <span style={{ fontStyle: "italic" }}>project client</span> : (r.value || "—")}</div>
                <div style={{ color: C.muted }}>{n} {n === 1 ? "entry" : "entries"}</div>
                <div style={{ color: C.muted, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.comment || "—"}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => setEditing(r)} style={iconBtn}>Edit</button>
                  <button onClick={() => remove(r)} style={{ ...iconBtn, color: C.red, borderColor: C.redSoft }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <EditModal initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

const iconBtn = { fontSize: 11.5, padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.line}`, background: "#fff", color: C.body, cursor: "pointer", fontFamily: "inherit" };

function EditModal({ initial, onClose, onSave }) {
  const [d, setD] = useState(initial);
  const isProject = d.type === "Project";
  return (
    <Modal title={initial.id ? "Edit Merge Variable" : "Add Merge Variable"} onClose={onClose}>
      <Field label="Variable name"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus placeholder="Client Name" /></Field>
      <Field label="Type">
        <Select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <div style={{ fontSize: 11.5, color: C.faint, marginTop: 6 }}>
          {isProject ? "Project — resolves to the project's client/prospect name automatically." : "Static — resolves to the fixed value below in every project."}
        </div>
      </Field>
      <Field label="Value">
        <Input value={isProject ? "" : d.value} onChange={(e) => setD({ ...d, value: e.target.value })} disabled={isProject} placeholder={isProject ? "Resolved from the project client" : "e.g. People.ai, Inc."} style={isProject ? { background: C.panel, color: C.faint } : undefined} />
      </Field>
      <Field label="Comments / Instructions"><Input value={d.comment} onChange={(e) => setD({ ...d, comment: e.target.value })} /></Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!d.name.trim() || (!isProject && !d.value.trim())} onClick={() => onSave(d)}>{initial.id ? "Save" : "Create"}</Button>
      </div>
    </Modal>
  );
}
