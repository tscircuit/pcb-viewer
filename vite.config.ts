import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  define: {
    "global": {},
  },
  resolve: {
    alias: {
      lib: resolve(__dirname, "src/lib"),
      hooks: resolve(__dirname, "src/hooks"),
      pages: resolve(__dirname, "src/pages"),
      
    },
  },
})