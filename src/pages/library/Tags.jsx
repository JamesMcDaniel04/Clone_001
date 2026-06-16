import { useEffect, useState } from "react";
import { C } from "../../lib/theme.js";
import { listTags, createTag } from "../../lib/db.js";
import { PageHeader, Button, Spinner, Empty, Pill, Input } from "../../components/ui.jsx";

export default function Tags() {
  const [tags, setTags] = useState(null);
  const [err, setErr] = useState(null);
  const [name, setName] = useState("");

  function load() {
    listTags().then(setTags).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function add() {
    if (!name.trim()) return;
    try {
      await createTag(name.trim());
      setName("");
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Tags" subtitle="Label library entries to group and filter them across categories." />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 420 }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="primary" onClick={add} style={{ whiteSpace: "nowrap" }}>Add Tag</Button>
      </div>

      {tags == null ? <Spinner /> : tags.length === 0 ? (
        <Empty title="No tags yet" />
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map((t) => <Pill key={t.id} tone="info">{t.name}</Pill>)}
        </div>
      )}
    </div>
  );
}
