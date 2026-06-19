import { Navigate } from "react-router-dom";
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
  const { user, loading } = useSession();

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <div style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Connect Supabase to continue</div>
        <div style={{ fontSize: 14, color: C.body, lineHeight: 1.6 }}>
          This is MAX: Machine Answer Expert. It needs a Supabase project for its database and sign-in. Add{" "}
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

  if (loading) {
    return <Centered><div style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>Loading…</div></Centered>;
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
