import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../lib/theme.js";
import { countRows, createProspect, listProspects } from "../lib/db.js";
import { Card, Button, Input } from "../components/ui.jsx";

const STEPS = ["Welcome", "Answer library", "Prospects", "Merge variables", "First project", "All set"];

export default function SetupWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState({ library: null, prospects: null, merge: null, projects: null });
  const [prospects, setProspects] = useState([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState(null);

  async function refresh() {
    try {
      const [library, merge, projects] = await Promise.all([
        countRows("library_entries"), countRows("merge_variables"), countRows("projects"),
      ]);
      let ps = [];
      try { ps = await listProspects(); } catch { /* table may not exist yet */ }
      setProspects(ps);
      setCounts({ library, prospects: ps.length, merge, projects });
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function addProspect() {
    if (!name.trim()) return;
    try { await createProspect(name.trim()); setName(""); refresh(); } catch (e) { setErr(e.message); }
  }

  const c = counts;
  const ok = (n) => n != null && n > 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: i === step ? C.ink : i < step ? C.green : C.faint, fontWeight: i === step ? 700 : 500 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: i < step ? C.green : i === step ? C.blueSoft : "#F1F1EE", color: i < step ? "#fff" : i === step ? C.blueInk : C.faint }}>{i < step ? "✓" : i + 1}</span>
            {s}{i < STEPS.length - 1 && <span style={{ color: C.line, marginLeft: 4 }}>›</span>}
          </span>
        ))}
      </div>

      <Card style={{ padding: "26px 28px" }}>
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        {step === 0 && (
          <Body title="Welcome to MAX" text="A quick tour to make sure everything's ready: your answer library, prospects, merge variables, and your first project. Takes about a minute.">
            <Button variant="primary" onClick={() => setStep(1)}>Start</Button>
          </Body>
        )}

        {step === 1 && (
          <Body title="Answer library" text={`Your library is the source of truth the AI drafts from. You currently have ${c.library ?? "…"} entries.`}>
            <Check ok={ok(c.library)} okText="Library has content — drafting will ground on it." badText="No entries yet. Run supabase/seed_library.sql, or add entries in Library → Management." />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button onClick={() => nav("/library")}>Open Library</Button>
              <Button variant="primary" onClick={() => setStep(2)}>Next</Button>
            </div>
          </Body>
        )}

        {step === 2 && (
          <Body title="Prospects / clients" text="Add the clients you answer questionnaires for. They show up in the prospect dropdown and resolve the [[Client Name]] merge variable.">
            <div style={{ display: "flex", gap: 8, margin: "8px 0 14px", maxWidth: 380 }}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Athena Health" onKeyDown={(e) => e.key === "Enter" && addProspect()} />
              <Button variant="primary" onClick={addProspect} style={{ whiteSpace: "nowrap" }}>Add</Button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {prospects.map((p) => <span key={p.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "3px 10px", fontSize: 12.5 }}>{p.name}</span>)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(3)}>Next</Button>
            </div>
          </Body>
        )}

        {step === 3 && (
          <Body title="Merge variables" text={`Reusable [[tokens]] that fill in per project — e.g. [[Client Name]] becomes the prospect. You have ${c.merge ?? "…"} defined (a Client Name default is built in).`}>
            <Check ok={true} okText="Built-in [[Client Name]], [[Prospect]], [[Company]] already resolve to the project's client." />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button onClick={() => nav("/library/merge-variables")}>Manage variables</Button>
              <Button variant="primary" onClick={() => setStep(4)}>Next</Button>
            </div>
          </Body>
        )}

        {step === 4 && (
          <Body title="Create your first project" text="A project is one questionnaire. Paste or import questions, hit Draft answers, then review and export.">
            <Check ok={ok(c.projects)} okText={`You have ${c.projects} project(s).`} badText="No projects yet — create one to see the full loop." />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button onClick={() => setStep(3)}>Back</Button>
              <Button variant="primary" onClick={() => nav("/projects?new=1")}>Create a project</Button>
              <Button onClick={() => setStep(5)}>Skip</Button>
            </div>
          </Body>
        )}

        {step === 5 && (
          <Body title="You're all set 🎉" text="Everything's wired: library, prospects, merge variables, and projects. Head to your dashboard.">
            <Button variant="primary" onClick={() => nav("/")}>Go to Home</Button>
          </Body>
        )}
      </Card>
    </div>
  );
}

function Body({ title, text, children }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 650, color: C.ink, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.body, lineHeight: 1.65, marginBottom: 8 }}>{text}</div>
      {children}
    </div>
  );
}
function Check({ ok, okText, badText }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: ok ? "#15803D" : C.tanInk, background: ok ? C.greenSoft : C.cream, border: `1px solid ${ok ? "#BBE7CB" : "#EFE2C2"}`, borderRadius: 9, padding: "10px 12px" }}>
      {ok ? "✓ " : "⚠ "}{ok ? okText : badText}
    </div>
  );
}
