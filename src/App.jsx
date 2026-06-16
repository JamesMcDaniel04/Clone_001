import { useState, useEffect, Fragment } from "react";

// ---------------------------------------------------------------------------
// CONFIG — no secrets here. The Anthropic key, Airtable token, and library URL
// all live server-side in the /api functions (see .env.example). The only
// client-side config is the prospect dropdown.
// ---------------------------------------------------------------------------
const CONFIG = {
  PROSPECTS: ["Cvent", "Govini", "AdaIQ", "Energy Toolbase", "Other"],
};

// ---------------------------------------------------------------------------
// PALETTE — warm, editorial (matches the design reference)
// ---------------------------------------------------------------------------
const C = {
  ink: "#1F2430",
  body: "#3A3F4B",
  muted: "#8A8F9A",
  faint: "#AEB2BB",
  line: "#EAEAE6",
  cardLine: "#E7E7E2",
  panel: "#FCFCFB",
  blue: "#3551C9",
  blueSoft: "#E7ECFB",
  blueInk: "#2A41B0",
  green: "#16A34A",
  greenSoft: "#E5F5EB",
  tan: "#F2EAD7",
  tanLine: "#E5D6B2",
  tanInk: "#7A5C20",
  cream: "#FBF5E7",
  amber: "#CDA24B",
};

// ---------------------------------------------------------------------------
// API CLIENT — talks to the serverless backend
// ---------------------------------------------------------------------------
async function fetchLibrary() {
  const res = await fetch("/api/library");
  if (!res.ok) throw new Error("Library fetch failed");
  return res.json(); // { library, source: "drive" | "fallback" }
}

async function draftAnswers(questions, prospect) {
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions, prospect }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Draft failed");
  return data.answers || [];
}

// Returns { id, fields } on success, { skipped } when Airtable isn't configured.
async function airtable(action, table, fields, recordId) {
  const res = await fetch("/api/airtable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, table, fields, recordId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Airtable request failed");
  return data;
}

// Map the model's structured flag_type onto a Question status.
function statusFromDraft(d) {
  if (!d.flag) return "Draft";
  switch (d.flag_type) {
    case "Needs engineering":
      return "Needs engineering";
    case "No library match":
      return "Withheld";
    case "Needs legal":
    case "Known gap":
    default:
      return "Needs legal";
  }
}

// ---------------------------------------------------------------------------
// ICONS
// ---------------------------------------------------------------------------
function IconCheck({ size = 12, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconShield({ size = 12, color = C.tanInk }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconBook({ size = 12, color = "#6B7280" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PILLS
// ---------------------------------------------------------------------------
function GapPill({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.tan, color: C.tanInk, border: `1px solid ${C.tanLine}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      <IconShield /> {children}
    </span>
  );
}
function MutedPill({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", background: "#F4F4F2", color: C.muted, border: "1px solid #ECECE8", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>
      {children}
    </span>
  );
}
function LibPill({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#4B5563", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>
      <IconBook /> {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// STEPPER — Question received → Library matched → Draft ready → Reviewer sign-off
// statuses: array of "complete" | "active" | "pending"
// ---------------------------------------------------------------------------
function Stepper({ statuses }) {
  const steps = ["Question received", "Library matched", "Draft ready", "Reviewer sign-off"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
      {steps.map((label, i) => {
        const st = statuses[i];
        const circle =
          st === "complete"
            ? { background: C.green, color: "#fff", border: `1px solid ${C.green}` }
            : st === "active"
            ? { background: C.blueSoft, color: C.blueInk, border: `1px solid ${C.blueSoft}` }
            : { background: "#F1F1EE", color: C.faint, border: "1px solid #ECECE8" };
        const labelColor = st === "active" ? C.ink : st === "complete" ? C.body : C.faint;
        return (
          <Fragment key={label}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, ...circle }}>
                {st === "complete" ? <IconCheck /> : i + 1}
              </span>
              <span style={{ fontSize: 12.5, color: labelColor, fontWeight: st === "active" ? 600 : 500, whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: C.line, margin: "0 12px", minWidth: 16 }} />}
          </Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QUESTION CARD
// ---------------------------------------------------------------------------
function QuestionCard({ q, idx, prospect, libraryLabel, onStatusChange, onAnswerEdit, onPromote }) {
  const [editing, setEditing] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState(q.edited_answer || q.draft_answer || "");
  const [promoted, setPromoted] = useState(false);

  const statusColors = {
    Draft: "#F3F4F2",
    Edited: "#EAF1FB",
    Approved: C.greenSoft,
    "Needs legal": C.tan,
    "Needs engineering": "#EDE9FE",
    Withheld: "#FCE8E6",
  };

  const card = {
    border: `1px solid ${C.cardLine}`,
    borderRadius: 16,
    padding: "20px 22px",
    marginBottom: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(16,24,40,0.03)",
  };
  const btn = { fontSize: 12, padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", background: "#fff", color: C.body };

  return (
    <div style={card}>
      {/* Label + question */}
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
        Question — {prospect} · {q.question_id || `Q${idx + 1}`}
      </div>
      <div style={{ fontSize: 16.5, color: C.ink, fontWeight: 550, lineHeight: 1.5, marginBottom: 12 }}>{q.question_text}</div>

      {/* Tag row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {q.flag && <GapPill>{q.flag_type || "Flagged for review"}</GapPill>}
        <MutedPill>Vendor security</MutedPill>
      </div>

      {/* Library matches */}
      {q.library_entries_used?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Library matches</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {q.library_entries_used.map((e) => (
              <LibPill key={e}>{e}</LibPill>
            ))}
          </div>
        </div>
      )}

      {/* Draft */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Claude draft</div>
        <div style={{ fontSize: 12, color: C.faint }}>Draft against: {libraryLabel}</div>
      </div>

      {q.draft_answer ? (
        editing ? (
          <div>
            <textarea
              value={editedAnswer}
              onChange={(e) => setEditedAnswer(e.target.value)}
              style={{ width: "100%", minHeight: 140, fontSize: 14, lineHeight: 1.7, border: `1px solid ${C.blueSoft}`, borderRadius: 10, padding: "12px 14px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: C.body }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => { onAnswerEdit(idx, editedAnswer); setEditing(false); }} style={{ ...btn, background: C.blue, color: "#fff", border: `1px solid ${C.blue}` }}>Save edit</button>
              <button onClick={() => { setEditedAnswer(q.edited_answer || q.draft_answer || ""); setEditing(false); }} style={btn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ border: `1px solid ${C.cardLine}`, borderRadius: 12, padding: "14px 16px", background: C.panel, fontSize: 14, lineHeight: 1.7, color: C.body, whiteSpace: "pre-wrap" }}>
            {q.edited_answer || q.draft_answer}
          </div>
        )
      ) : (
        <div style={{ border: `1px solid #F1D9D6`, borderRadius: 12, padding: "14px 16px", background: "#FDF4F3", fontSize: 13.5, color: "#B4453B", fontStyle: "italic" }}>
          No library match — answer withheld. Flag for manual input.
        </div>
      )}

      {/* Flag callout */}
      {q.flag && q.flag_reason && (
        <div style={{ marginTop: 12, background: C.cream, border: "1px solid #EFE2C2", borderLeft: `3px solid ${C.amber}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#6B4E1E", lineHeight: 1.55 }}>
          <span style={{ marginRight: 4 }}>⚠</span>
          <strong>Flagged for review:</strong> {q.flag_reason}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 12, color: C.muted }}>Status</span>
        <select
          value={q.status || "Draft"}
          onChange={(e) => onStatusChange(idx, e.target.value)}
          style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: statusColors[q.status] || "#F3F4F2", cursor: "pointer", color: C.ink, fontWeight: 500 }}
        >
          {["Draft", "Edited", "Approved", "Needs legal", "Needs engineering", "Withheld"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {!editing && q.draft_answer && (
            <button onClick={() => setEditing(true)} style={btn}>Edit</button>
          )}
          {!promoted && q.status === "Approved" && (
            <button onClick={() => { onPromote(idx); setPromoted(true); }} style={{ ...btn, background: C.greenSoft, border: `1px solid #BBE7CB`, color: "#15803D" }}>Save to library</button>
          )}
          {promoted && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#15803D", fontWeight: 600 }}>
              <IconCheck color="#15803D" /> Saved to library
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------
export default function App() {
  const [step, setStep] = useState("input"); // input | drafting | review
  const [prospect, setProspect] = useState("Govini");
  const [rawInput, setRawInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [libraryStatus, setLibraryStatus] = useState("loading"); // loading | ready | fallback | error
  const [questRecordId, setQuestRecordId] = useState(null);
  const [error, setError] = useState(null);
  const [exportMsg, setExportMsg] = useState(null);

  // Load library status on mount
  useEffect(() => {
    fetchLibrary()
      .then(({ source }) => setLibraryStatus(source === "drive" ? "ready" : "fallback"))
      .catch(() => setLibraryStatus("error"));
  }, []);

  // Parse pasted input into individual questions
  function parseQuestions(raw) {
    return raw
      .split(/\n+/)
      .map((l) => l.replace(/^[\d]+[.)]\s*/, "").trim())
      .filter((l) => l.length > 10);
  }

  async function handleDraft() {
    if (!rawInput.trim()) return;
    const parsed = parseQuestions(rawInput);
    if (!parsed.length) return;
    setError(null);
    setStep("drafting");

    try {
      // Create the questionnaire record (no-op if Airtable isn't configured)
      const qRec = await airtable("create", "questionnaires", {
        Name: `${prospect} — ${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
        Prospect: prospect,
        Status: "Draft",
        "Question count": parsed.length,
        "Submitted at": new Date().toISOString().slice(0, 10),
      });
      const questionnaireId = qRec.id || null;
      setQuestRecordId(questionnaireId);

      // Draft with Claude
      const drafts = await draftAnswers(parsed, prospect);

      // Enrich with status, persist each question, capture the Airtable record id
      const enriched = await Promise.all(
        drafts.map(async (d, i) => {
          const status = statusFromDraft(d);
          const fields = {
            "Question ID": d.question_id || `Q${i + 1}`,
            "Question text": d.question_text,
            "Claude draft": d.draft_answer || "",
            "Edited answer": d.draft_answer || "",
            Status: status,
            Flag: !!d.flag,
            "Flag reason": d.flag_reason || "",
            "Library entries used": d.library_entries_used || [],
          };
          if (questionnaireId) fields.Questionnaire = [questionnaireId];

          const rec = await airtable("create", "questions", fields);
          const airtableId = rec.id || null;

          if (d.flag && airtableId) {
            await airtable("create", "flags", {
              "Flagged by": "Claude",
              "Flag type": d.flag_type || "Needs legal",
              Question: [airtableId],
            });
          }

          return { ...d, status, edited_answer: d.draft_answer || "", airtable_id: airtableId };
        })
      );

      setQuestions(enriched);
      setStep("review");
    } catch (err) {
      setError("Something went wrong: " + err.message);
      setStep("input");
    }
  }

  function handleStatusChange(idx, status) {
    setQuestions((qs) => {
      const updated = [...qs];
      updated[idx] = { ...updated[idx], status };
      if (updated[idx].airtable_id) {
        airtable("update", "questions", { Status: status }, updated[idx].airtable_id).catch(() => {});
      }
      return updated;
    });
  }

  function handleAnswerEdit(idx, text) {
    setQuestions((qs) => {
      const updated = [...qs];
      updated[idx] = { ...updated[idx], edited_answer: text };
      if (updated[idx].airtable_id) {
        airtable("update", "questions", { "Edited answer": text, Status: "Edited" }, updated[idx].airtable_id).catch(() => {});
      }
      return updated;
    });
  }

  async function handlePromote(idx) {
    const q = questions[idx];
    try {
      await airtable("create", "library", {
        "Entry name": (q.question_text || "").slice(0, 60),
        "Answer text": q.edited_answer,
        "Last updated": new Date().toISOString().slice(0, 10),
        "Known gap": !!q.flag,
        Active: true,
      });
      if (q.airtable_id) {
        await airtable("update", "questions", { "Promoted to library": true }, q.airtable_id);
      }
    } catch (err) {
      setError("Could not save to library: " + err.message);
    }
  }

  function exportToText() {
    const approved = questions.filter((q) => q.status === "Approved");
    const lines = approved.map(
      (q, i) => `Q${i + 1}: ${q.question_text}\n\nA: ${q.edited_answer}\n\n${q.flag ? "⚠ FLAGGED: " + (q.flag_reason || "") + "\n" : ""}---`
    );
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prospect}_questionnaire_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg(approved.length ? `Exported ${approved.length} approved answer(s)` : "No approved answers to export yet");
    setTimeout(() => setExportMsg(null), 3000);
  }

  const approvedCount = questions.filter((q) => q.status === "Approved").length;
  const flaggedCount = questions.filter((q) => q.flag).length;
  const needsActionCount = questions.filter((q) => ["Needs legal", "Needs engineering", "Draft"].includes(q.status)).length;

  const libraryLabel = { loading: "Loading library…", ready: "Full library", fallback: "Fallback library", error: "Library unavailable" }[libraryStatus];

  const btn = { fontSize: 12.5, padding: "7px 14px", borderRadius: 9, border: `1px solid ${C.line}`, cursor: "pointer", background: "#fff", color: C.body };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "2.25rem 1.5rem", color: C.ink }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: "1.75rem" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconShield size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 650 }}>Clone — security questionnaire tool</div>
          <div style={{ fontSize: 12, color: C.muted }}>Library: {libraryLabel}</div>
        </div>
        {step === "review" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={exportToText} style={btn}>Export approved (.txt)</button>
            <button onClick={() => { setStep("input"); setQuestions([]); setRawInput(""); setQuestRecordId(null); }} style={btn}>New questionnaire</button>
          </div>
        )}
      </div>

      {exportMsg && (
        <div style={{ background: C.greenSoft, color: "#15803D", fontSize: 13, padding: "9px 14px", borderRadius: 9, marginBottom: 14, border: "1px solid #BBE7CB" }}>{exportMsg}</div>
      )}

      {/* Input step */}
      {step === "input" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: C.muted, whiteSpace: "nowrap" }}>Prospect</label>
            <select value={prospect} onChange={(e) => setProspect(e.target.value)} style={{ fontSize: 13, padding: "7px 11px", borderRadius: 9, border: `1px solid ${C.line}`, background: "#fff", color: C.ink }}>
              {CONFIG.PROSPECTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={`Paste questionnaire questions here — one per line, numbered or not.\n\nExample:\n1. Is your platform FedRAMP authorized?\n2. Do you support SSO via SAML 2.0?\n3. What is your data retention policy?`}
            style={{ width: "100%", height: 250, fontSize: 14, lineHeight: 1.6, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: C.ink }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <button
              onClick={handleDraft}
              disabled={!rawInput.trim() || libraryStatus === "loading"}
              style={{ fontSize: 13.5, padding: "9px 22px", borderRadius: 9, border: `1px solid ${C.blue}`, background: C.blue, color: "#fff", cursor: rawInput.trim() ? "pointer" : "not-allowed", opacity: rawInput.trim() && libraryStatus !== "loading" ? 1 : 0.5, fontWeight: 600 }}
            >
              Draft answers
            </button>
            <span style={{ fontSize: 12.5, color: C.faint }}>{rawInput.trim() ? `~${parseQuestions(rawInput).length} questions detected` : ""}</span>
          </div>
          {error && <div style={{ marginTop: 12, fontSize: 13, color: "#DC2626" }}>{error}</div>}
        </div>
      )}

      {/* Drafting step */}
      {step === "drafting" && (
        <div>
          <Stepper statuses={["complete", "complete", "active", "pending"]} />
          <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Drafting answers…</div>
            <div style={{ fontSize: 13, color: C.muted }}>Matching library entries and generating drafts for {prospect}</div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
          </div>
        </div>
      )}

      {/* Review step */}
      {step === "review" && (
        <div>
          <Stepper statuses={["complete", "complete", "complete", "active"]} />

          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 15px", fontSize: 13 }}>
              <span style={{ color: C.muted }}>Total </span>
              <strong>{questions.length}</strong>
            </div>
            <div style={{ background: C.greenSoft, border: "1px solid #BBE7CB", borderRadius: 10, padding: "9px 15px", fontSize: 13 }}>
              <span style={{ color: "#15803D" }}>Approved </span>
              <strong style={{ color: "#15803D" }}>{approvedCount}</strong>
            </div>
            <div style={{ background: C.tan, border: `1px solid ${C.tanLine}`, borderRadius: 10, padding: "9px 15px", fontSize: 13 }}>
              <span style={{ color: C.tanInk }}>Flagged </span>
              <strong style={{ color: C.tanInk }}>{flaggedCount}</strong>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 15px", fontSize: 13 }}>
              <span style={{ color: C.muted }}>Needs action </span>
              <strong>{needsActionCount}</strong>
            </div>
          </div>

          {questions.map((q, i) => (
            <QuestionCard
              key={q.airtable_id || i}
              q={q}
              idx={i}
              prospect={prospect}
              libraryLabel={libraryStatus === "ready" ? "Full library" : "Fallback library"}
              onStatusChange={handleStatusChange}
              onAnswerEdit={handleAnswerEdit}
              onPromote={handlePromote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
