import { useState } from "react";
import { Link } from "react-router-dom";
import { C, STATUS_DOT, STATUS_LABEL } from "../../lib/theme.js";
import { listEntries } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Input, StatusDot } from "../../components/ui.jsx";

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    if (!q.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      setResults(await listEntries({ search: q.trim() }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Search the Library" subtitle="Find existing knowledge content across every category." />
      <div style={{ display: "flex", gap: 8, marginBottom: 22, maxWidth: 620 }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="Search titles & content…" autoFocus />
        <Button variant="primary" onClick={run} style={{ whiteSpace: "nowrap" }}>Search</Button>
      </div>

      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {loading ? <Spinner /> : results == null ? (
        <Empty title="Search the library" hint="Type a keyword and hit Search." />
      ) : results.length === 0 ? (
        <Empty title="No matches" hint="Try different keywords." />
      ) : (
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{results.length} result{results.length === 1 ? "" : "s"}</div>
          {results.map((e) => (
            <div key={e.id} style={{ background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{e.title}</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}><StatusDot color={STATUS_DOT[e.status]} /> {STATUS_LABEL[e.status]}</span>
              </div>
              <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{e.content}</div>
              {e.category && (
                <Link to={`/library/category/${e.category_id}`} style={{ fontSize: 12, color: C.blueInk, textDecoration: "none", marginTop: 8, display: "inline-block" }}>{e.category.name} →</Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
