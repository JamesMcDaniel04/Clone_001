import { useState } from "react";
import { C } from "../lib/theme.js";
import { Modal, Button, Select, Spinner } from "./ui.jsx";
import { fileKind, readSheet, guessQuestionColumn, columnValues, extractFromDocument, downloadTemplate } from "../lib/importParsers.js";

export default function ImportModal({ onClose, onImport }) {
  const [tab, setTab] = useState("excel");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [sheet, setSheet] = useState(null); // { headers, data }
  const [qCol, setQCol] = useState(0);
  const [docQuestions, setDocQuestions] = useState(null);
  const [fileName, setFileName] = useState("");

  function reset() { setSheet(null); setDocQuestions(null); setErr(null); setFileName(""); }

  async function onExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset(); setBusy(true); setFileName(file.name);
    try {
      const k = fileKind(file.name);
      if (k !== "excel" && k !== "csv") throw new Error("Choose an .xlsx, .xls, or .csv file.");
      const s = await readSheet(file);
      if (!s.data.length) throw new Error("No rows found in that spreadsheet.");
      setSheet(s);
      setQCol(guessQuestionColumn(s.headers, s.data));
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  async function onDoc(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset(); setBusy(true); setFileName(file.name);
    try {
      const qs = await extractFromDocument(file);
      if (!qs.length) throw new Error("Couldn't find any questions in that document.");
      setDocQuestions(qs);
    } catch (e2) {
      setErr(e2.message || "Couldn't read that file. Try Excel/CSV or paste the text instead.");
    } finally { setBusy(false); }
  }

  const excelQuestions = sheet ? columnValues(sheet.data, qCol) : [];
  const ready = tab === "excel" ? excelQuestions.length : (docQuestions?.length || 0);

  function doImport() {
    onImport(tab === "excel" ? excelQuestions : docQuestions);
  }

  const tabStyle = (active) => ({
    padding: "8px 4px", marginRight: 22, background: "transparent", border: "none", cursor: "pointer",
    fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? C.blueInk : C.muted,
    borderBottom: active ? `2px solid ${C.blueInk}` : "2px solid transparent", fontFamily: "inherit",
  });

  return (
    <Modal title="Project Import" onClose={onClose} width={560}>
      <div style={{ borderBottom: `1px solid ${C.line}`, marginBottom: 18 }}>
        <button style={tabStyle(tab === "excel")} onClick={() => { setTab("excel"); reset(); }}>Excel / CSV Template</button>
        <button style={tabStyle(tab === "document")} onClick={() => { setTab("document"); reset(); }}>Source Document</button>
      </div>

      {tab === "excel" ? (
        <div>
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6, marginBottom: 12 }}>
            Download a template and fill in your questions (one per row), then upload it.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Button onClick={() => downloadTemplate(false)} style={{ fontSize: 12 }}>⬇ Excel (Empty)</Button>
            <Button onClick={() => downloadTemplate(true)} style={{ fontSize: 12 }}>⬇ Excel (Sample)</Button>
          </div>
          <FilePick label="Choose an Excel / CSV file" accept=".xlsx,.xls,.xlsm,.csv" onChange={onExcel} name={fileName} />
          {sheet && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Which column holds the questions?</div>
              <Select value={qCol} onChange={(e) => setQCol(Number(e.target.value))}>
                {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </Select>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6, marginBottom: 14 }}>
            Upload a questionnaire as <strong>.docx</strong>, <strong>.pdf</strong>, or <strong>.txt</strong> — Clone extracts the questions (one per line).
          </div>
          <FilePick label="Choose a document" accept=".docx,.pdf,.txt,.md" onChange={onDoc} name={fileName} />
        </div>
      )}

      {busy && <Spinner label="Reading file…" />}
      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</div>}
      {!busy && !err && ready > 0 && (
        <div style={{ marginTop: 14, fontSize: 13, color: "#15803D", background: C.greenSoft, border: "1px solid #BBE7CB", borderRadius: 9, padding: "9px 12px" }}>
          ✓ {ready} question{ready === 1 ? "" : "s"} detected
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ready} onClick={doImport} style={{ opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}>
          Import {ready ? `${ready} →` : ""}
        </Button>
      </div>
    </Modal>
  );
}

function FilePick({ label, accept, onChange, name }) {
  return (
    <label style={{ display: "block", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", background: C.panel }}>
      <div style={{ fontSize: 13, color: C.body, fontWeight: 500 }}>{name || label}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Click to browse</div>
      <input type="file" accept={accept} onChange={onChange} style={{ display: "none" }} />
    </label>
  );
}
