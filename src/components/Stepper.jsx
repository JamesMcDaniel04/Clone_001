import { Fragment } from "react";
import { C } from "../lib/theme.js";
import { IconCheck } from "./icons.jsx";

// statuses: array of "complete" | "active" | "pending"
export default function Stepper({ steps, statuses }) {
  const labels = steps || ["Question received", "Library matched", "Draft ready", "Reviewer sign-off"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
      {labels.map((label, i) => {
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
            {i < labels.length - 1 && <div style={{ flex: 1, height: 1, background: C.line, margin: "0 12px", minWidth: 16 }} />}
          </Fragment>
        );
      })}
    </div>
  );
}
