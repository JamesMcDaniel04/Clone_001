import { useSession } from "./SessionProvider.jsx";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { C, font } from "../lib/theme.js";

function Centered({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: font, padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%", background: "#fff", border: `1px solid ${C.cardLine}`, borderRadius: 16, padding: "28px 30px", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>{children}</div>
    </div>
  );
}

export default function RequireAuth({ children }) {
  const { user, loading, anonError } = useSession();

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <div style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Connect Supabase to continue</div>
        <div style={{ fontSize: 14, color: C.body, lineHeight: 1.6 }}>
          This is the Clone platform. It needs a Supabase project for its database and sign-in. Add{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>VITE_SUPABASE_URL</code> and{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>VITE_SUPABASE_ANON_KEY</code>{" "}
          or <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>VITE_SUPABASE_PUBLISHABLE_KEY</code> to{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>.env.local</code>, run the SQL in{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>supabase/</code>, then restart. Full steps are in{" "}
          <code style={{ background: C.panel, padding: "1px 5px", borderRadius: 5 }}>docs/SETUP.md</code>.
        </div>
      </Centered>
    );
  }

  if (anonError) {
    return (
      <Centered>
        <div style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Enable anonymous sign-ins</div>
        <div style={{ fontSize: 14, color: C.body, lineHeight: 1.6 }}>
          This shared workspace uses anonymous Supabase sessions instead of a login screen. Enable it in{" "}
          <strong>Supabase → Authentication → Sign In / Providers → Anonymous Sign-Ins</strong>{" "}
          (toggle on, Save), then refresh this page.
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>Supabase said: {anonError}</div>
        </div>
      </Centered>
    );
  }

  if (loading || !user) {
    return <Centered><div style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>Starting shared workspace...</div></Centered>;
  }

  return children;
}
