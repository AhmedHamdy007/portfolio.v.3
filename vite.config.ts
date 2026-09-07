import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: './',
  // DOM attribute instrumentation cannot be applied to R3F host objects:
  // Three interprets "code-path" as a nested property and crashes on HMR.
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
    },
  },
});
