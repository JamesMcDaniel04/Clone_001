import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { C } from "../../lib/theme.js";
import { getProject, getProjectEntries, insertProjectEntries, updateProjectEntry, createEntry, listMergeVariables, updateProject, getLibraryText } from "../../lib/db.js";
import { PageHeader, Button, Spinner } from "../../components/ui.jsx";
import Stepper from "../../components/Stepper.jsx";
import QuestionCard from "../../components/QuestionCard.jsx";
import ImportModal from "../../components/ImportModal.jsx";
import { buildResolver } from "../../lib/mergeVars.js";

function parseQuestions(raw) {
  return raw.split(/\n+/).map((l) => l.replace(/^[\d]+[.)]\s*/, "").trim()).filter((l) => l.length > 10);
}
function statusFromDraft(d) {
  if (!d.flag) return "draft";
  if (d.flag_type === "Needs engineering") return "needs_engineering";
  if (d.flag_type === "No library match") return "withheld";
  return "needs_legal";
}

export default function Project() {
  const { id } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState(null);
  const [raw, setRaw] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | drafting
  const [err, setErr] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [mergeVars, setMergeVars] = useState([]);

  useEffect(() => {
    getProject(id).then(setProject).catch((e) => setErr(e.message));
    getProjectEntries(id).then(setEntries).catch((e) => setErr(e.message));
    listMergeVariables().then(setMergeVars).catch(() => {});
  }, [id]);

  // Pre-fill the draft box from a template's questions (passed via navigation state).
  useEffect(() => {
    const pre = location.state?.prefillQuestions;
    if (pre && pre.length) setRaw(pre.join("\n"));
  }, []);

  async function saveAsTemplate() {
    try {
      const updated = await updateProject(id, { is_template: true });
      setProject(updated);
      setExportMsg("Saved as a template — it'll appear under Available Templates when creating a project.");
      setTimeout(() => setExportMsg(null), 3500);
    } catch (e) { setErr(e.message); }
  }

  // Resolve [[merge variable]] tokens against this project (client name, etc.).
  const { resolve: resolveMV } = buildResolver(mergeVars, project);

  async function handleDraft() {
    const parsed = parseQuestions(raw);
    if (!parsed.length) return;
    setErr(null);
    setPhase("drafting");
    try {
      // Pass the live library from the client (it can read it via the session) so
      // drafting always grounds on Supabase, not the server fallback.
      const library = await getLibraryText().catch(() => null);
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsed, prospect: project?.prospect || "Unknown", library }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft failed");

      const rows = (data.answers || []).map((d, i) => ({
        project_id: id,
        question_id: d.question_id || `Q${i + 1}`,
        question: d.question_text,
        draft_answer: d.draft_answer || null,
        edited_answer: d.draft_answer || null,
        status: statusFromDraft(d),
        flag: !!d.flag,
        flag_type: d.flag_type || null,
        flag_reason: d.flag_reason || null,
        library_entries_used: d.library_entries_used || [],
        position: i,
      }));
      const saved = await insertProjectEntries(rows);
      setEntries(saved);
      setRaw("");
      setPhase("idle");
    } catch (e) {
      setErr(e.message);
      setPhase("idle");
    }
  }

  function patch(idx, fields) {
    setEntries((es) => {
      const next = [...es];
      next[idx] = { ...next[idx], ...fields };
      if (next[idx].id) updateProjectEntry(next[idx].id, fields).catch(() => {});
      return next;
    });
  }
  function handleStatusChange(idx, status) { patch(idx, { status }); }
  function handleAnswerEdit(idx, text) { patch(idx, { edited_answer: text, status: "edited" }); }
  async function handlePromote(idx) {
    const q = entries[idx];
    try {
      await createEntry({ question: q.question, answer: q.edited_answer, status: "never_reviewed" });
    } catch (e) { setErr("Could not save to library: " + e.message); }
  }

  function exportTxt() {
    const approved = (entries || []).filter((q) => q.status === "approved");
    const lines = approved.map((q, i) => `Q${i + 1}: ${q.question}\n\nA: ${resolveMV(q.edited_answer)}\n\n${q.flag ? "⚠ FLAGGED: " + (q.flag_reason || "") + "\n" : ""}---`);
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project?.prospect || "project"}_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg(approved.length ? `Exported ${approved.length} approved answer(s)` : "No approved answers yet");
    setTimeout(() => setExportMsg(null), 3000);
  }

  if (err && !project) return <div style={{ color: C.red, fontSize: 13 }}>{err}</div>;
  if (!project || entries == null) return <Spinner />;

  const hasEntries = entries.length > 0;
  const approved = entries.filter((q) => q.status === "approved").length;
  const flagged = entries.filter((q) => q.flag).length;

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`${project.prospect || "—"} · ${entries.length} questions${project.is_template ? " · Template" : ""}`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {!project.is_template && <Button onClick={saveAsTemplate}>Save as Template</Button>}
            {hasEntries && <Button onClick={exportTxt}>Export approved (.txt)</Button>}
          </div>
        }
      />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {exportMsg && <div style={{ background: C.greenSoft, color: "#15803D", fontSize: 13, padding: "9px 14px", borderRadius: 9, marginBottom: 14, border: "1px solid #BBE7CB" }}>{exportMsg}</div>}

      {phase === "drafting" ? (
        <div>
          <Stepper statuses={["complete", "complete", "active", "pending"]} />
          <Spinner label={`Drafting answers for ${project.prospect || "this project"}…`} />
        </div>
      ) : !hasEntries ? (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <Button onClick={() => setImportOpen(true)}>Import Questions</Button>
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`Paste questionnaire questions here — one per line, numbered or not.\n\nExample:\n1. Is your platform FedRAMP authorized?\n2. Do you support SSO via SAML 2.0?\n3. What is your data retention policy?`}
            style={{ width: "100%", height: 250, fontSize: 14, lineHeight: 1.6, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: C.ink }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <Button variant="primary" disabled={!raw.trim()} onClick={handleDraft} style={{ opacity: raw.trim() ? 1 : 0.5, cursor: raw.trim() ? "pointer" : "not-allowed" }}>Draft answers</Button>
            <span style={{ fontSize: 12.5, color: C.faint }}>{raw.trim() ? `~${parseQuestions(raw).length} questions detected` : ""}</span>
          </div>
        </div>
      ) : (
        <div>
          <Stepper statuses={["complete", "complete", "complete", "active"]} />
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <Stat label="Total" value={entries.length} />
            <Stat label="Approved" value={approved} tone="green" />
            <Stat label="Flagged" value={flagged} tone="tan" />
          </div>
          {entries.map((q, i) => (
            <QuestionCard key={q.id || i} q={q} idx={i} prospect={project.prospect} libraryLabel="Full library" resolve={resolveMV} onStatusChange={handleStatusChange} onAnswerEdit={handleAnswerEdit} onPromote={handlePromote} />
          ))}
        </div>
      )}

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={(qs) => {
            setRaw((prev) => (prev.trim() ? prev.trim() + "\n" : "") + qs.join("\n"));
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const styles = {
    default: { background: C.panel, border: `1px solid ${C.line}`, color: C.muted },
    green: { background: C.greenSoft, border: "1px solid #BBE7CB", color: "#15803D" },
    tan: { background: C.tan, border: `1px solid ${C.tanLine}`, color: C.tanInk },
  };
  const s = styles[tone] || styles.default;
  return (
    <div style={{ background: s.background, border: s.border, borderRadius: 10, padding: "9px 15px", fontSize: 13 }}>
      <span style={{ color: s.color }}>{label} </span>
      <strong style={{ color: tone ? s.color : C.ink }}>{value}</strong>
    </div>
  );
}
