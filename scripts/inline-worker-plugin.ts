import { build, type Plugin } from "esbuild"
import { resolve } from "node:path"

/** Match Vite's inline-worker import so the published bundle needs no worker asset URL. */
export const inlineWorkerPlugin: Plugin = {
  name: "inline-pcb-render-worker",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\?worker&inline$/ }, (args) => ({
      path: resolve(
        args.resolveDir,
        args.path.replace(/\?worker&inline$/, ".ts"),
      ),
      namespace: "inline-worker",
    }))
    pluginBuild.onLoad(
      { filter: /.*/, namespace: "inline-worker" },
      async (args) => {
        const result = await build({
          entryPoints: [args.path],
          bundle: true,
          write: false,
          platform: "browser",
          format: "iife",
          target: "es2020",
          minify: true,
          tsconfig: "tsconfig.json",
        })
        const source = result.outputFiles[0].text
        return {
          contents: `export default function RenderWorker() {
        const url = URL.createObjectURL(new Blob([${JSON.stringify(source)}], {type: "text/javascript"}));
        try { return new Worker(url); } finally { URL.revokeObjectURL(url); }
      }`,
          loader: "js",
        }
      },
    )
  },
}
