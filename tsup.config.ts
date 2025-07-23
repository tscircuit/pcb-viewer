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
  external: ["react", "react-dom", "react-reconciler", "react-reconciler-18"],
})
