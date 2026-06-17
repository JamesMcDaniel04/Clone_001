import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../lib/theme.js";
import { listProjects, listReviews } from "../lib/db.js";
import { Card, Button, Spinner, Empty } from "../components/ui.jsx";

export default function Home() {
  const nav = useNavigate();
  const [projects, setProjects] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([listProjects(), listReviews({ status: "never_reviewed" })])
      .then(([p, r]) => { setProjects(p); setReviews(r); })
      .catch((e) => setErr(e.message));
  }, []);

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

      <Section title="My Project Tasks">
        {projects == null ? <Spinner /> : projects.length === 0 ? (
          <Empty title="No project tasks right now." />
        ) : (
          projects.slice(0, 6).map((p) => (
            <Row key={p.id} onClick={() => nav(`/projects/${p.id}`)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{p.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{p.prospect || "—"} · {p.entries?.[0]?.count ?? 0} questions</div>
              </div>
              <StatusTag status={p.status} />
            </Row>
          ))
        )}
      </Section>

      <Section title="My Reviews">
        {reviews == null ? <Spinner /> : reviews.length === 0 ? (
          <Empty title="No reviews at the moment." />
        ) : (
          reviews.slice(0, 8).map((r) => (
            <Row key={r.id} onClick={() => nav("/reviews")}>
              <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.4 }}>{r.question}</div>
              <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{r.category?.name || "No Category"}</span>
            </Row>
          ))
        )}
      </Section>
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
