import { useEffect, useState } from "react";
import { C, STATUS_DOT, STATUS_LABEL } from "../../lib/theme.js";
import { listReviews, listCategories, updateEntry } from "../../lib/db.js";
import { PageHeader, Spinner, Empty, Select, Input, StatusDot, Button } from "../../components/ui.jsx";

const STATUSES = ["all", "assigned", "unassigned", "approved_with_edits", "approved_without_edits", "never_reviewed"];

export default function Reviews() {
  const [cats, setCats] = useState([]);
  const [filters, setFilters] = useState({ categoryId: "all", status: "all", search: "" });
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { listCategories().then(setCats).catch(() => {}); }, []);

  function load() {
    setRows(null);
    listReviews(filters).then(setRows).catch((e) => setErr(e.message));
  }
  useEffect(load, [filters.categoryId, filters.status]);

  return (
    <div>
      <PageHeader title="Reviews" subtitle="The review queue across the library. Filter, then approve or send entries for sign-off." />
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
        rows.map((r) => <ReviewRow key={r.id} row={r} onChange={load} />)
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
  async function setStatus(status) {
    try {
      const fields = { status };
      if (status.startsWith("approved")) fields.reviewed_at = new Date().toISOString();
      await updateEntry(row.id, fields);
      onChange();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{row.question}</div>
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6 }}>{row.answer}</div>
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8 }}>
            {row.category?.name || "No Category"} · updated {row.updated_at?.slice(0, 10)}
            {row.reviewer?.full_name ? ` · reviewed by ${row.reviewer.full_name}` : ""}
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
    </div>
  );
}
