import { Navigate } from "react-router-dom";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { useSession } from "../auth/SessionProvider.jsx";
import { C, font } from "../lib/theme.js";

export default function Login() {
  const { user } = useSession();
  if (user) return <Navigate to="/" replace />;
  if (isSupabaseConfigured) return <Navigate to="/" replace />;

  return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <div style={{ width: 420, maxWidth: "100%", background: "#fff", borderRadius: 16, padding: "34px 32px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>MAX</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 650, color: C.ink, marginBottom: 6 }}>Machine Answer Expert</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
          This deployment uses a shared workspace. Everyone with access to the app sees the same projects, reviews, and answer library.
        </div>

        <div style={{ fontSize: 13, color: C.body, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", lineHeight: 1.55 }}>
          Supabase isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> or <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code> and follow <code>docs/SETUP.md</code>.
        </div>
      </div>
    </div>
  );
}
