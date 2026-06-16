import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../../lib/theme.js";
import { useSession } from "../../auth/SessionProvider.jsx";
import { listProjects, createProject } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input, Select } from "../../components/ui.jsx";

const PROSPECTS = ["Cvent", "Govini", "AdaIQ", "Energy Toolbase", "Other"];

export default function List() {
  const nav = useNavigate();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(params.get("new") === "1");
  const [draft, setDraft] = useState({ name: "", prospect: "Govini" });

  function load() { listProjects().then(setRows).catch((e) => setErr(e.message)); }
  useEffect(load, []);

  async function create() {
    if (!draft.name.trim()) return;
    try {
      const p = await createProject({ name: draft.name.trim(), prospect: draft.prospect, owner_id: user?.id, status: "draft" });
      setAdding(false);
      params.delete("new"); setParams(params);
      nav(`/projects/${p.id}`);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader title="Projects" subtitle="Each project is a questionnaire or RFP you're answering." actions={<Button variant="primary" onClick={() => setAdding(true)}>+ Create a Project</Button>} />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {rows == null ? <Spinner /> : rows.length === 0 ? (
        <Empty title="No projects yet" hint="Create one to start drafting answers." />
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, overflow: "hidden" }}>
          {rows.map((p) => (
            <div key={p.id} onClick={() => nav(`/projects/${p.id}`)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.panel)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{p.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{p.prospect || "—"} · {p.entries?.[0]?.count ?? 0} questions · created {p.created_at?.slice(0, 10)}</div>
              </div>
              <StatusTag status={p.status} />
            </div>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Create a Project" onClose={() => { setAdding(false); params.delete("new"); setParams(params); }}>
          <Field label="Project name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus placeholder="e.g. Govini RFI — Jun 2026" /></Field>
          <Field label="Prospect">
            <Select value={draft.prospect} onChange={(e) => setDraft({ ...draft, prospect: e.target.value })}>
              {PROSPECTS.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={create}>Create</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatusTag({ status }) {
  const map = { draft: ["Draft", "#F3F4F2", C.muted], in_review: ["In review", C.tan, C.tanInk], approved: ["Approved", C.greenSoft, "#15803D"], sent: ["Sent", C.blueSoft, C.blueInk], legal_flagged: ["Legal flagged", C.tan, C.tanInk] };
  const [label, bg, color] = map[status] || map.draft;
  return <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 7, background: bg, color }}>{label}</span>;
}
