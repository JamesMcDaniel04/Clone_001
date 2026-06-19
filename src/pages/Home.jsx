import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../lib/theme.js";
import { listProjects, listGapEntries } from "../lib/db.js";
import { Card, Button, Spinner, Empty } from "../components/ui.jsx";

export default function Home() {
  const nav = useNavigate();
  const [projects, setProjects] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => setErr(e.message));
    listGapEntries().then(setGaps).catch(() => setGaps([]));
  }, []);

  // Time metrics — surface AI savings (avg first-draft time) and completion speed.
  const projectList = (projects || []).filter((p) => !p.is_template);
  const completedProjects = projectList.filter((p) => p.submitted_at && p.created_at);
  const openProjects = projectList.filter((p) => !p.submitted_at);
  const avgCompleteHours = completedProjects.length
    ? Math.round(completedProjects.reduce((s, p) => s + (Date.parse(p.submitted_at) - Date.parse(p.created_at)) / 3.6e6, 0) / completedProjects.length)
    : null;
  const withDraft = projectList.filter((p) => p.first_draft_seconds);
  const avgDraftSeconds = withDraft.length
    ? Math.round(withDraft.reduce((s, p) => s + p.first_draft_seconds, 0) / withDraft.length)
    : null;
  const oldestOpenHours = openProjects.length
    ? Math.max(...openProjects.map((p) => (Date.now() - Date.parse(p.created_at)) / 3.6e6))
    : 0;

  return (
    <div>
      <div style={{ background: C.navy, borderRadius: 16, padding: "26px 28px", marginBottom: 24, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.navyHi, border: `1px solid ${C.navyLine}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>CL</div>
          <div>
            <div style={{ fontSize: 13, color: C.navyText }}>Welcome,</div>
            <div style={{ fontSize: 20, fontWeight: 650 }}>team</div>
          </div>
        </div>
        <Button variant="primary" onClick={() => nav("/projects?new=1")} style={{ background: "#fff", color: C.navy, border: "none" }}>Create a New Project</Button>
      </div>

      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{err}</div>}

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Average time to complete" value={avgCompleteHours == null ? "—" : `${avgCompleteHours} hours`} hint={completedProjects.length ? `across ${completedProjects.length} completed project${completedProjects.length === 1 ? "" : "s"}` : "complete a project to start the clock"} accent={C.blueInk} />
        <StatCard label="Avg first-draft time" value={avgDraftSeconds == null ? "—" : `${avgDraftSeconds}s`} hint="AI drafting time saved per questionnaire" accent={C.green} />
        <StatCard label="Open projects" value={openProjects.length} hint={openProjects.length ? `oldest open ${fmtHours(oldestOpenHours)}` : "all caught up"} />
      </div>

      <Section title="My Project Tasks">
        {projects == null ? <Spinner /> : projects.length === 0 ? (
          <Empty title="No project tasks right now." />
        ) : (
          projects.slice(0, 6).map((p) => (
            <Row key={p.id} onClick={() => nav(`/projects/${p.id}`)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{p.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{p.prospect || "—"} · {p.entries?.[0]?.count ?? 0} questions · {ageLabel(p)}</div>
              </div>
              <StatusTag status={p.status} />
            </Row>
          ))
        )}
      </Section>

      <Section title="Gaps — questions with no answer yet">
        {gaps == null ? <Spinner /> : gaps.length === 0 ? (
          <Empty title="No open gaps." hint="When the drafter can't ground a question in your library, it shows up here so you can add the missing answer." />
        ) : (
          gaps.slice(0, 8).map((g) => (
            <Row key={g.id} onClick={() => nav(`/projects/${g.project_id}`)}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.question}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{g.project?.name || "Project"}{g.project?.prospect ? ` · ${g.project.prospect}` : ""}</div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 7, background: C.redSoft, color: C.red, border: "1px solid #F1D9D6", whiteSpace: "nowrap" }}>Gap</span>
            </Row>
          ))
        )}
      </Section>

      <Section title="My Reviews">
        <Empty title="No reviews have been completed yet." hint="Reviewed answers will appear here after the team starts approving library or project responses." />
      </Section>
    </div>
  );
}

function fmtHours(h) {
  if (h == null || Number.isNaN(h)) return "—";
  if (h < 1) return "<1h";
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function ageLabel(p) {
  if (!p.created_at) return "";
  if (p.submitted_at) return `completed in ${fmtHours((Date.parse(p.submitted_at) - Date.parse(p.created_at)) / 3.6e6)}`;
  return `open ${fmtHours((Date.now() - Date.parse(p.created_at)) / 3.6e6)}`;
}

function StatCard({ label, value, hint, accent }) {
  return (
    <div style={{ flex: "1 1 200px", minWidth: 180, background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent || C.ink, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {hint && <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.body, marginBottom: 10 }}>{title}</div>
      <Card style={{ padding: 6 }}>{children}</Card>
    </div>
  );
}

function Row({ children, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "12px 14px", borderRadius: 10, cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.panel)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      {children}
    </div>
  );
}

function StatusTag({ status }) {
  const map = { draft: ["Draft", "#F3F4F2", C.muted], in_review: ["In review", C.tan, C.tanInk], approved: ["Approved", C.greenSoft, "#15803D"], sent: ["Sent", C.blueSoft, C.blueInk], legal_flagged: ["Legal flagged", C.tan, C.tanInk] };
  const [label, bg, color] = map[status] || map.draft;
  return <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 7, background: bg, color }}>{label}</span>;
}
