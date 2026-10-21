import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target:
          process.env.RETURN_CURRENT_DEV_API_URL ?? "http://127.0.0.1:3031",
        changeOrigin: true,
      },
    },
  },
  define: {
    global: {},
    __RETURN_CURRENT_API_URL__: JSON.stringify(
      process.env.VITE_RETURN_CURRENT_API_URL ??
        (command === "build"
          ? "https://return-current-simulation-service.seve.workers.dev/api"
          : "/api"),
    ),
  },
  resolve: {
    alias: {
      lib: resolve(__dirname, "src/lib"),
      hooks: resolve(__dirname, "src/hooks"),
      pages: resolve(__dirname, "src/pages"),
    },
  },
}))
