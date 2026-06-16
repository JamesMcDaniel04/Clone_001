import { useEffect, useState } from "react";
import { C } from "../../lib/theme.js";
import { listMergeVariables, createMergeVariable } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input } from "../../components/ui.jsx";

export default function MergeVariables() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", type: "Project", value: "", comment: "" });

  function load() {
    listMergeVariables().then(setRows).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function add() {
    if (!draft.name.trim()) return;
    try {
      await createMergeVariable(draft);
      setDraft({ name: "", type: "Project", value: "", comment: "" });
      setAdding(false);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Merge Variables"
        subtitle="Reusable values you can drop into project answers — update once, applied everywhere."
        actions={<Button variant="primary" onClick={() => setAdding(true)}>+ Add Merge Variable</Button>}
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {rows == null ? <Spinner /> : rows.length === 0 ? (
        <Empty title="No merge variables yet" />
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr 90px 1.6fr", gap: 12, padding: "11px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.muted, fontWeight: 600 }}>
            <div>Variable Name</div><div>Type</div><div>Value</div><div>Used</div><div>Comments / Instructions</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr 90px 1.6fr", gap: 12, padding: "13px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 13, alignItems: "center", color: C.body }}>
              <div style={{ fontWeight: 500, color: C.ink }}>{r.name}</div>
              <div style={{ color: C.muted }}>{r.type}</div>
              <div style={{ color: C.muted }}>{r.value || "—"}</div>
              <div style={{ color: C.muted }}>{r.times_used ?? 0}</div>
              <div style={{ color: C.muted, fontStyle: "italic" }}>{r.comment || "—"}</div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Add Merge Variable" onClose={() => setAdding(false)}>
          <Field label="Variable name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus /></Field>
          <Field label="Type"><Input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} /></Field>
          <Field label="Value"><Input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} /></Field>
          <Field label="Comments / Instructions"><Input value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={add}>Create</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
