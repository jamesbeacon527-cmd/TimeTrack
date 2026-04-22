import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// For GitHub Pages: set VITE_BASE to "/<repo-name>/" at build time, or update the default below.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig(({ mode }) => ({
  base,
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: { overlay: false },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
