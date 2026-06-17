import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Dev-only: serve the /api functions (currently /api/draft) inside `vite dev`, so
// local development needs no Vercel CLI. In production, Vercel serves api/*.js
// natively and this plugin does nothing (apply: "serve").
function devApi(env) {
  const SERVER_KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "LIBRARY_DOC_URL", "KNOWLEDGE_SOURCE_URLS"];
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      // Make server-side vars from .env available to the function handler.
      for (const k of SERVER_KEYS) if (env[k] && process.env[k] === undefined) process.env[k] = env[k];

      const API_ROUTES = new Set(["draft", "report"]);
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/") || req.method !== "POST") return next();
        const name = req.url.replace(/^\/api\//, "").split("?")[0].replace(/\/+$/, "");
        if (!API_ROUTES.has(name)) return next();
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            req.body = body ? JSON.parse(body) : {};
            res.status = (c) => ((res.statusCode = c), res);
            res.json = (o) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); return res; };
            const mod = await import(pathToFileURL(path.resolve(`api/${name}.js`)).href);
            await mod.default(req, res);
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: e.message || `${name} failed` }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), devApi(env)],
    server: {
      port: 3000,
      strictPort: true,
      // Allow the app to be reached through an ngrok tunnel (Vite blocks
      // unknown Host headers by default). `.ngrok-free.dev` covers any
      // reserved ngrok subdomain.
      allowedHosts: [".ngrok-free.dev", ".ngrok.app", ".ngrok.io"],
    },
  };
});
