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
    global: {},
    __RETURN_CURRENT_API_URL__: JSON.stringify(
      process.env.VITE_RETURN_CURRENT_API_URL ??
        "https://simulate.tscircuit.com/api",
    ),
  },
  resolve: {
    alias: {
      lib: resolve(__dirname, "src/lib"),
      hooks: resolve(__dirname, "src/hooks"),
      pages: resolve(__dirname, "src/pages"),
    },
  },
})
