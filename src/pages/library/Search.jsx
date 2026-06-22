import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { C, STATUS_DOT, STATUS_LABEL } from "../../lib/theme.js";
import { listEntries, listTags } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Input, StatusDot } from "../../components/ui.jsx";

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);

  useEffect(() => { listTags().then(setAllTags).catch(() => {}); }, []);

  async function run(tags = tagFilter) {
    if (!q.trim() && !tags.length) { setResults(null); return; }
    setLoading(true);
    setErr(null);
    try {
      setResults(await listEntries({ search: q.trim() || undefined, tags }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(name) {
    const next = tagFilter.includes(name) ? tagFilter.filter((t) => t !== name) : [...tagFilter, name];
    setTagFilter(next);
    run(next); // re-run immediately so the filter feels live
  }

  return (
    <div>
      <PageHeader title="Search the Library" subtitle="Find existing knowledge content across every category — by keyword, tag, or both." />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, maxWidth: 620 }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="Search titles & content…" autoFocus />
        <Button variant="primary" onClick={() => run()} style={{ whiteSpace: "nowrap" }}>Search</Button>
      </div>

      {allTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Tags:</span>
          {allTags.map((t) => {
            const active = tagFilter.includes(t.name);
            return (
              <button key={t.id} onClick={() => toggleTag(t.name)} style={{
                fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${active ? C.blue : C.line}`, background: active ? C.blueSoft : "#fff", color: active ? C.blueInk : C.body,
              }}>{t.name}</button>
            );
          })}
          {tagFilter.length > 0 && (
            <button onClick={() => { setTagFilter([]); run([]); }} style={{ fontSize: 12, border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
          )}
        </div>
      )}

      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {loading ? <Spinner /> : results == null ? (
        <Empty title="Search the library" hint="Type a keyword, pick a tag, or both." />
      ) : results.length === 0 ? (
        <Empty title="No matches" hint="Try different keywords or tags." />
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
              {(e.tags || []).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {e.tags.map((t) => (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", background: C.blueSoft, color: C.blueInk, border: `1px solid ${C.blueSoft}`, borderRadius: 7, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
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
