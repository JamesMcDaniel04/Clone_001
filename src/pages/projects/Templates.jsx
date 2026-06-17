import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../lib/theme.js";
import { createProject, deleteProject, listProjects, updateProject } from "../../lib/db.js";
import { Button, Empty, Field, Input, Modal, Select, Spinner } from "../../components/ui.jsx";

const STATUS_LABEL = { draft: "Draft", approved: "Published", in_review: "In review", legal_flagged: "Legal flagged", sent: "Sent" };

export default function Templates() {
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "", createdBy: "all", type: "all", status: "all", broken: false });

  function load() { listProjects().then(setRows).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  async function createTemplate(name) {
    try {
      const p = await createProject({ name, prospect: "Project Template", is_template: true, owner_id: null, status: "draft" });
      setAdding(false);
      nav(`/projects/${p.id}`);
    } catch (e) { setErr(e.message); }
  }

  async function remove(t) {
    if (!confirm(`Delete template "${t.name}"? This can't be undone.`)) return;
    try { await deleteProject(t.id); load(); } catch (e) { setErr(e.message); }
  }

  async function markDraft(t) {
    try { await updateProject(t.id, { status: "draft" }); load(); } catch (e) { setErr(e.message); }
  }

  async function saveTemplate(t) {
    if (!t.name.trim()) return;
    try {
      await updateProject(t.id, { name: t.name.trim(), status: t.status });
      setEditing(null);
      load();
    } catch (e) { setErr(e.message); }
  }

  const templates = (rows || []).filter((p) => p.is_template);
  const visible = templates.filter((p) => {
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status !== "all" && p.status !== filters.status) return false;
    return true;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 18 }}>
      <aside style={{ borderRight: `1px solid ${C.line}`, paddingRight: 16, minHeight: "calc(100vh - 96px)" }}>
        <Rail label="Search Templates">
          <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search by Name" />
        </Rail>
        <Rail label="Created By">
          <Select value={filters.createdBy} onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}>
            <option value="all">Select Team Member</option>
            <option value="shared">Shared workspace</option>
          </Select>
        </Rail>
        <Rail label="Template Type">
          <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="all">All</option>
            <option value="project">Project Template</option>
          </Select>
        </Rail>
        <Rail label="Status">
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="approved">Published</option>
          </Select>
        </Rail>
        <Rail label="Alerts">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.body }}>
            <input type="checkbox" checked={filters.broken} onChange={(e) => setFilters({ ...filters, broken: e.target.checked })} />
            Has Broken References
          </label>
        </Rail>
      </aside>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.line}`, paddingBottom: 12, marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 650, color: C.ink }}>Templates</h1>
          <Button variant="primary" onClick={() => setAdding(true)}>Create New</Button>
        </div>
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        {rows == null ? <Spinner /> : visible.length === 0 ? (
          <Empty title={templates.length ? "No results match your query" : "No templates yet"} hint={templates.length ? "Try adjusting or removing filters." : "Create one to build a reusable project structure."} />
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: C.muted, marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" /> Select All</label>
              <span>Showing 1-{visible.length} of {visible.length}</span>
            </div>
            <div style={{ border: `1px solid ${C.line}`, background: "#fff", overflow: "hidden" }}>
              <div style={gridHeader}>
                <span>Name</span><span>Created By</span><span>Date Created</span><span>Last Updated</span><span>Times Used</span><span>Status</span><span />
              </div>
              {visible.map((t) => (
                <div key={t.id} style={gridRow}>
                  <button onClick={() => nav(`/projects/${t.id}`)} style={{ textAlign: "left", border: "none", background: "transparent", cursor: "pointer", color: C.ink, fontFamily: "inherit" }}>
                    <div style={{ color: C.blueInk, fontWeight: 650, fontSize: 13.5 }}>{t.name}</div>
                    <div style={{ color: C.body, fontSize: 12.5 }}>Project Template</div>
                  </button>
                  <span>{t.owner?.full_name || "Shared workspace"}</span>
                  <span>{formatDate(t.created_at)}</span>
                  <span>{formatDate(t.updated_at || t.created_at)}</span>
                  <span>0</span>
                  <span style={{ color: t.status === "approved" ? C.green : C.blueInk }}>{STATUS_LABEL[t.status] || "Draft"}</span>
                  <span style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => setEditing(t)} style={linkBtn}>Edit</button>
                    {t.status === "approved" && <button onClick={() => markDraft(t)} style={linkBtn}>Draft</button>}
                    <button onClick={() => remove(t)} style={{ ...linkBtn, color: C.red }}>Delete</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {adding && <CreateTemplateModal onClose={() => setAdding(false)} onCreate={createTemplate} />}
      {editing && <EditTemplateModal template={editing} onClose={() => setEditing(null)} onSave={saveTemplate} />}
    </div>
  );
}

function Rail({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.body, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function CreateTemplateModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  return (
    <Modal title="Create Template" onClose={onClose}>
      <Field label="Template name">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Standard Security Questionnaire" />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Create</Button>
      </div>
    </Modal>
  );
}

function EditTemplateModal({ template, onClose, onSave }) {
  const [d, setD] = useState({ id: template.id, name: template.name, status: template.status || "draft" });
  return (
    <Modal title="Edit Template" onClose={onClose}>
      <Field label="Template name">
        <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
      </Field>
      <Field label="Status">
        <Select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
          <option value="draft">Draft</option>
          <option value="approved">Published</option>
        </Select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>Save</Button>
      </div>
    </Modal>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const gridHeader = {
  display: "grid",
  gridTemplateColumns: "2fr 1.1fr 1fr 1fr .8fr .8fr .8fr",
  gap: 12,
  padding: "10px 14px",
  borderBottom: `1px solid ${C.line}`,
  fontSize: 12,
  color: C.muted,
  fontWeight: 700,
};
const gridRow = {
  display: "grid",
  gridTemplateColumns: "2fr 1.1fr 1fr 1fr .8fr .8fr .8fr",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  borderBottom: `1px solid ${C.line}`,
  fontSize: 13,
  color: C.body,
};
const linkBtn = { border: "none", background: "transparent", color: C.blueInk, cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" };
