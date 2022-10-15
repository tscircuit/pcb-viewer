import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src"],
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true,
  loader: {
    ".ts": "tsx",
  },
})
