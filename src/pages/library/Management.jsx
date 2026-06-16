import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../lib/theme.js";
import { listCategories, createCategory } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Modal, Field, Input } from "../../components/ui.jsx";

export default function Management() {
  const nav = useNavigate();
  const [cats, setCats] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  function load() {
    listCategories().then(setCats).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function add() {
    if (!newName.trim()) return;
    try {
      await createCategory(newName.trim());
      setNewName("");
      setAdding(false);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  const total = cats?.reduce((n, c) => n + (c.entries?.[0]?.count ?? 0), 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Library Management"
        subtitle={cats ? `Default · ${total} entries` : "Default"}
        actions={<Button variant="primary" onClick={() => setAdding(true)}>+ Add Category</Button>}
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {cats == null ? (
        <Spinner />
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 160px 160px", gap: 12, padding: "11px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.muted, fontWeight: 600 }}>
            <div>Category</div><div>Entries</div><div>Next Review Cycle</div><div>Reviewer</div>
          </div>
          {cats.map((c) => (
            <div key={c.id} onClick={() => nav(`/library/category/${c.id}`)} style={{ display: "grid", gridTemplateColumns: "1fr 90px 160px 160px", gap: 12, padding: "13px 18px", borderBottom: `1px solid ${C.line}`, fontSize: 13.5, alignItems: "center", cursor: "pointer", color: C.ink }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.panel)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ color: C.blueInk, fontWeight: 500 }}>{c.name}</div>
              <div>{c.entries?.[0]?.count ?? 0}{(c.entries?.[0]?.count ?? 0) === 0 ? "" : ""}</div>
              <div style={{ color: C.muted }}>{c.next_review_cycle || "—"}</div>
              <div style={{ color: C.muted }}>{c.reviewer?.full_name || "—"}</div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Add Category" onClose={() => setAdding(false)}>
          <Field label="Category name"><Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus placeholder="e.g. InfoSec" /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={add}>Create</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
