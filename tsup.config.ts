import { inlineWorkerPlugin } from "./scripts/inline-worker-plugin"
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src"],
  splitting: false,
  esbuildPlugins: [inlineWorkerPlugin],
  dts: true,
  sourcemap: true,
  clean: true,
  tsconfig: "./tsconfig.build.json",
  loader: {
    ".ts": "tsx",
  },
  external: [
    "@tscircuit/core",
    "react",
    "react-dom",
    "react-reconciler",
    "react-reconciler-18",
  ],
})
