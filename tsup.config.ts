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
  // Keep externals here: --external in the build script replaces this list.
  external: [
    "@tscircuit/core",
    "react",
    "react-dom",
    "react-reconciler",
    "react-reconciler-18",
  ],
})
