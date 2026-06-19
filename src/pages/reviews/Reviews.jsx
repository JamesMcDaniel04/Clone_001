import { useEffect, useState } from "react";
import { C, STATUS_DOT, STATUS_LABEL } from "../../lib/theme.js";
import { listReviews, listCategories, updateEntry, deleteEntry } from "../../lib/db.js";
import { PageHeader, Spinner, Empty, Select, Input, StatusDot, Button, Pager } from "../../components/ui.jsx";

const STATUSES = ["all", "assigned", "unassigned", "approved_with_edits", "approved_without_edits", "never_reviewed"];

export default function Reviews() {
  const [cats, setCats] = useState([]);
  const [filters, setFilters] = useState({ categoryId: "all", status: "all", search: "" });
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { listCategories().then(setCats).catch(() => {}); }, []);

  function load() {
    setRows(null);
    listReviews(filters).then(setRows).catch((e) => setErr(e.message));
  }
  useEffect(load, [filters.categoryId, filters.status]);
  useEffect(() => setPage(1), [rows]);

  return (
    <div>
      <PageHeader title="Reviews — From Library" subtitle="Periodic review of existing library entries. Filter, then approve or reassign." />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22, background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: 16 }}>
        <Labeled label="Category">
          <Select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
            <option value="all">All Categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Status">
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All Statuses" : STATUS_LABEL[s]}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Search">
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Keyword…" />
            <Button onClick={load} style={{ whiteSpace: "nowrap" }}>Apply</Button>
          </div>
        </Labeled>
      </div>

      {rows == null ? <Spinner /> : rows.length === 0 ? (
        <Empty title="There are no Reviews matching your current filters" hint="Try adjusting or removing filters to see results" />
      ) : (
        <>
          <Pager page={page} total={rows.length} onPage={setPage} />
          {rows.slice((page - 1) * 10, page * 10).map((r) => <ReviewRow key={r.id} row={r} onChange={load} />)}
          <Pager page={page} total={rows.length} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ReviewRow({ row, onChange }) {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(row.title);
  const [a, setA] = useState(row.content || "");

  async function setStatus(status) {
    try {
      const fields = { status };
      if (status.startsWith("approved")) fields.reviewed_at = new Date().toISOString();
      await updateEntry(row.id, fields);
      onChange();
    } catch (e) { alert(e.message); }
  }
  async function save() {
    try { await updateEntry(row.id, { title: q, content: a }); setEditing(false); onChange(); } catch (e) { alert(e.message); }
  }
  async function remove() {
    if (!confirm("Delete this library entry?")) return;
    try { await deleteEntry(row.id); onChange(); } catch (e) { alert(e.message); }
  }

  const iconBtn = { fontSize: 11.5, padding: "5px 11px", borderRadius: 7, border: `1px solid ${C.line}`, background: "#fff", color: C.body, cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      {editing ? (
        <div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8, fontWeight: 600 }} />
          <textarea value={a} onChange={(e) => setA(e.target.value)} style={{ width: "100%", minHeight: 110, fontSize: 13.5, lineHeight: 1.7, padding: "10px 12px", borderRadius: 9, border: `1px solid ${C.blueSoft}`, boxSizing: "border-box", fontFamily: "inherit", color: C.body }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={save} style={{ padding: "6px 14px" }}>Save</Button>
            <Button onClick={() => { setQ(row.title); setA(row.content || ""); setEditing(false); }} style={{ padding: "6px 14px" }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{row.title}</div>
            <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{row.content}</div>
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8 }}>
              {row.category?.name || "No Category"} · updated {row.updated_at?.slice(0, 10)}{row.reviewer?.full_name ? ` · reviewed by ${row.reviewer.full_name}` : ""}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button onClick={() => setEditing(true)} style={iconBtn}>Edit</button>
              <button onClick={remove} style={{ ...iconBtn, color: C.red, borderColor: C.redSoft }}>Delete</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}>
              <StatusDot color={STATUS_DOT[row.status]} /> {STATUS_LABEL[row.status]}
            </span>
            <Select value={row.status} onChange={(e) => setStatus(e.target.value)} style={{ fontSize: 11.5, padding: "5px 8px", width: "auto" }}>
              <option value="never_reviewed">Never reviewed</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
              <option value="approved_with_edits">Approved with edits</option>
              <option value="approved_without_edits">Approved without edits</option>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
