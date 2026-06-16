import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The /api/* serverless functions are run by `vercel dev` (and by Vercel in
// production). For full local dev — UI + API together — run `vercel dev`.
// `npm run dev` runs only the Vite UI (the library/draft calls will 404 until
// you use `vercel dev` or deploy).
export default defineConfig({
  plugins: [react()],
});
