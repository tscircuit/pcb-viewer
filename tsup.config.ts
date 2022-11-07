import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src"],
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true,
  tsconfig: "./tsconfig.build.json",
  loader: {
    ".ts": "tsx",
  },
})
