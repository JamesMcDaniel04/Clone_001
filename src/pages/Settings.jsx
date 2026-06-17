import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { C } from "../lib/theme.js";
import { listProspects, createProspect, deleteProspect } from "../lib/db.js";
import { PageHeader, Card, Button, Spinner, Input } from "../components/ui.jsx";

export default function Settings() {
  const [prospects, setProspects] = useState(null);
  const [name, setName] = useState("");
  const [pErr, setPErr] = useState(null);

  function loadProspects() {
    listProspects().then(setProspects).catch((e) => { setProspects([]); setPErr(e.message); });
  }
  useEffect(() => { loadProspects(); }, []);

  async function add() {
    if (!name.trim()) return;
    try { await createProspect(name.trim()); setName(""); setPErr(null); loadProspects(); } catch (e) { setPErr(e.message); }
  }
  async function remove(p) {
    try { await deleteProspect(p.id); loadProspects(); } catch (e) { setPErr(e.message); }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Settings" subtitle="Manage prospects and app configuration." actions={<Link to="/setup" style={{ textDecoration: "none" }}><Button>Run setup wizard</Button></Link>} />

      <Section title="Workspace">
        <Card style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 40, height: 40, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>CL</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Shared workspace</div>
            <div style={{ fontSize: 12.5, color: C.muted }}>Everyone using this deployment sees the same projects, reviews, and answer library.</div>
          </div>
        </Card>
      </Section>

      <Section title="Prospects / clients">
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>These appear in the prospect dropdown when creating a project.</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, maxWidth: 420 }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a prospect / client name" onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button variant="primary" onClick={add} style={{ whiteSpace: "nowrap" }}>Add</Button>
          </div>
          {pErr && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 10 }}>{pErr.includes("prospects") || pErr.includes("relation") ? "Prospects table not found — run supabase/migrations/0002_prospects.sql, then refresh." : pErr}</div>}
          {prospects == null ? <Spinner /> : prospects.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted }}>No prospects yet.</div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {prospects.map((p) => (
                <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 8px 5px 12px", fontSize: 13 }}>
                  {p.name}
                  <button onClick={() => remove(p)} title="Remove" style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Configuration">
        <Card style={{ padding: "8px 6px" }}>
          <Row label="Access mode" value="Shared anonymous sessions" />
          <Row label="Login screen" value="Disabled" />
          <Row label="Drafting model" value="Set server-side via ANTHROPIC_MODEL (default claude-opus-4-8)" last />
        </Card>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.body, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: last ? "none" : `1px solid ${C.line}`, fontSize: 13 }}>
      <span style={{ color: C.muted }}>{label}</span><span style={{ color: C.ink, textAlign: "right" }}>{value}</span>
    </div>
  );
}
