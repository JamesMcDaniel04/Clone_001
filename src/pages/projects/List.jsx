import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../../lib/theme.js";
import { useSession } from "../../auth/SessionProvider.jsx";
import { listProjects, createProject, getProjectEntries, deleteProject, updateProject, listProspects } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Modal, Field, Input, Select } from "../../components/ui.jsx";

const DEFAULT_PROSPECTS = ["Cvent", "Govini", "AdaIQ", "Energy Toolbase", "Other"];
const STATUS_LABEL = { draft: "Draft", in_review: "In review", legal_flagged: "Legal flagged", approved: "Approved", sent: "Sent" };

export default function List() {
  const nav = useNavigate();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(params.get("new") === "1");
  const [editingProject, setEditingProject] = useState(null);
  const [prospects, setProspects] = useState(DEFAULT_PROSPECTS);
  const [filters, setFilters] = useState({ search: "", status: "all", owner: "all", involvement: "participating", type: "all" });

  function load() { listProjects().then(setRows).catch((e) => setErr(e.message)); }
  useEffect(() => {
    load();
    listProspects().then((rs) => rs.length && setProspects([...rs.map((r) => r.name), "Other"])).catch(() => {});
  }, []);

  async function remove(p) {
    if (!confirm(`Delete project "${p.name}" and all its questions? This can't be undone.`)) return;
    try { await deleteProject(p.id); load(); } catch (e) { setErr(e.message); }
  }
  async function saveEdit(d) {
    try { await updateProject(d.id, { name: d.name, prospect: d.prospect, status: d.status }); setEditingProject(null); load(); } catch (e) { setErr(e.message); }
  }

  const owners = [...new Set((rows || []).map((p) => p.owner?.full_name).filter(Boolean))];
  const visible = (rows || []).filter((p) => {
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.owner !== "all" && p.owner?.full_name !== filters.owner) return false;
    if (filters.search && !(`${p.name} ${p.prospect || ""}`.toLowerCase().includes(filters.search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 24 }}>
      <aside>
        <Rail label="Search Projects"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search by name, client…" /></Rail>
        <Rail label="Project Owner">
          <Select value={filters.owner} onChange={(e) => setFilters({ ...filters, owner: e.target.value })}>
            <option value="all">All team members</option>
            {owners.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Rail>
        <Rail label="Involvement">
          <Select value={filters.involvement} onChange={(e) => setFilters({ ...filters, involvement: e.target.value })}>
            <option value="participating">Participating In</option>
            <option value="all">All Projects</option>
          </Select>
        </Rail>
        <Rail label="Project Status">
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="all">All</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Rail>
        <Rail label="Project Type">
          <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="all">All</option></Select>
        </Rail>
      </aside>

      <div>
        <PageHeader title="Projects" subtitle="Each project is a questionnaire or RFP you're answering." actions={<Button variant="primary" onClick={() => setAdding(true)}>+ Create a Project</Button>} />
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        {rows == null ? <Spinner /> : visible.length === 0 ? (
          <Empty title={rows.length ? "No results match your query" : "No projects yet"} hint={rows.length ? "Try adjusting or removing filters." : "Create one to start drafting answers."} />
        ) : (
          <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 14, overflow: "hidden" }}>
            {visible.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${C.line}` }}>
                <div onClick={() => nav(`/projects/${p.id}`)} style={{ cursor: "pointer", flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{p.prospect || "—"} · {p.entries?.[0]?.count ?? 0} questions{p.owner?.full_name ? ` · ${p.owner.full_name}` : ""} · {p.created_at?.slice(0, 10)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {p.is_template && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#EDE9FE", color: "#5B21B6" }}>Template</span>}
                  <StatusTag status={p.status} />
                  <button onClick={() => setEditingProject(p)} style={iconBtn}>Edit</button>
                  <button onClick={() => remove(p)} style={{ ...iconBtn, color: C.red, borderColor: C.redSoft }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {adding && (
        <CreateProjectModal
          user={user}
          prospects={prospects}
          templates={(rows || []).filter((p) => p.is_template)}
          onClose={() => { setAdding(false); params.delete("new"); setParams(params); }}
          onCreated={(p, prefillQuestions) => nav(`/projects/${p.id}`, { state: { prefillQuestions } })}
          onError={setErr}
        />
      )}
      {editingProject && <EditProjectModal project={editingProject} prospects={prospects} onClose={() => setEditingProject(null)} onSave={saveEdit} />}
    </div>
  );
}

const iconBtn = { fontSize: 11.5, padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.line}`, background: "#fff", color: C.body, cursor: "pointer", fontFamily: "inherit" };

function Rail({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.body, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function EditProjectModal({ project, prospects, onClose, onSave }) {
  const [d, setD] = useState({ id: project.id, name: project.name, prospect: project.prospect || "", status: project.status });
  return (
    <Modal title="Edit Project" onClose={onClose}>
      <Field label="Project name"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus /></Field>
      <Field label="Prospect / client">
        <Select value={d.prospect} onChange={(e) => setD({ ...d, prospect: e.target.value })}>
          {[d.prospect, ...prospects.filter((p) => p !== d.prospect)].filter(Boolean).map((p) => <option key={p}>{p}</option>)}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>Save</Button>
      </div>
    </Modal>
  );
}

function CreateProjectModal({ user, prospects, onClose, onCreated, onError, templates }) {
  const [draft, setDraft] = useState({ name: "", prospect: prospects[0] || "Govini" });
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(fromTemplateId) {
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      const p = await createProject({ name: draft.name.trim(), prospect: draft.prospect, owner_id: user?.id || null, status: "draft" });
      let prefillQuestions = [];
      if (fromTemplateId) {
        const src = await getProjectEntries(fromTemplateId);
        prefillQuestions = src.map((e) => e.question).filter(Boolean);
      }
      onCreated(p, prefillQuestions);
    } catch (e) { onError(e.message); setBusy(false); }
  }

  const sectionLabel = { fontSize: 14, fontWeight: 650, color: C.ink };
  const sectionDesc = { fontSize: 12.5, color: C.muted, marginTop: 2 };

  return (
    <Modal title="Create a Project" onClose={onClose} width={620}>
      <Field label="Project name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus placeholder="e.g. Govini RFI — Jun 2026" /></Field>
      <Field label="Prospect / client">
        <Select value={draft.prospect} onChange={(e) => setDraft({ ...draft, prospect: e.target.value })}>
          {prospects.map((p) => <option key={p}>{p}</option>)}
        </Select>
      </Field>

      <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 4 }}>
        <Row>
          <div>
            <div style={sectionLabel}>Respond to a Source Document</div>
            <div style={sectionDesc}>Import questions from a document (Excel, Word, PDF) or paste your own.</div>
          </div>
          <Button variant="primary" disabled={!draft.name.trim() || busy} onClick={() => create(null)} style={{ opacity: draft.name.trim() ? 1 : 0.5, whiteSpace: "nowrap" }}>Create Project</Button>
        </Row>
        <Row last>
          <div style={{ flex: 1 }}>
            <div style={sectionLabel}>Available Templates</div>
            <div style={sectionDesc}>Start from a template created by your team.</div>
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ marginTop: 8, maxWidth: 320 }} disabled={!templates.length}>
              <option value="">{templates.length ? "Choose a template…" : "No Templates to Choose from"}</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <Button disabled={!templateId || !draft.name.trim() || busy} onClick={() => create(templateId)} style={{ opacity: templateId && draft.name.trim() ? 1 : 0.5, whiteSpace: "nowrap", alignSelf: "flex-start" }}>Use Template</Button>
        </Row>
      </div>
    </Modal>
  );
}

function Row({ children, last }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>{children}</div>;
}

function StatusTag({ status }) {
  const map = { draft: ["Draft", "#F3F4F2", C.muted], in_review: ["In review", C.tan, C.tanInk], approved: ["Approved", C.greenSoft, "#15803D"], sent: ["Sent", C.blueSoft, C.blueInk], legal_flagged: ["Legal flagged", C.tan, C.tanInk] };
  const [label, bg, color] = map[status] || map.draft;
  return <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 7, background: bg, color }}>{label}</span>;
}
