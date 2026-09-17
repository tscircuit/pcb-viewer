import { CircuitToWebGpuDrawer } from "circuit-json-webgpu"
import type { WebGpuRequest, WebGpuResponse } from "./protocol"
const scope = self as unknown as {
  onmessage: (event: MessageEvent<WebGpuRequest>) => void
  postMessage: (message: WebGpuResponse) => void
  requestAnimationFrame?: (callback: () => void) => number
}
let drawer: CircuitToWebGpuDrawer | undefined
let canvas: OffscreenCanvas
let latestView: Extract<WebGpuRequest, { type: "view" }> | undefined
let scheduled = false,
  failed = false
const fail = (error: unknown) => {
  if (failed) return
  failed = true
  drawer?.dispose()
  scope.postMessage({
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  })
}
function schedule() {
  if (scheduled || failed || !drawer || !latestView) return
  scheduled = true
  const render = () => {
    scheduled = false
    if (failed || !drawer || !latestView) return
    try {
      const view = latestView
      if (canvas.width !== view.width) canvas.width = view.width
      if (canvas.height !== view.height) canvas.height = view.height
      drawer.render({ ...view.options, transform: view.transform })
      scope.postMessage({
        type: "rendered",
        geometryUploads: drawer.stats.geometryUploads,
        frames: drawer.stats.frames,
        compileMs: drawer.stats.compileMs,
      })
    } catch (error) {
      fail(error)
    }
  }
  if (scope.requestAnimationFrame) scope.requestAnimationFrame(render)
  else setTimeout(render, 16)
}
scope.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      canvas = data.canvas
      drawer = await CircuitToWebGpuDrawer.create(canvas, {
        onDeviceLost: fail,
      })
      if (failed) {
        drawer.dispose()
        return
      }
      scope.postMessage({ type: "ready" })
    } else if (data.type === "scene") {
      drawer!.setCircuitJson(data.elements)
      if (drawer!.diagnostics.length)
        throw new Error(
          `Unsupported WebGPU geometry: ${drawer!.diagnostics.map((d) => `${d.type}: ${d.message}`).join("; ")}`,
        )
      schedule()
    } else if (data.type === "view") {
      latestView = data
      schedule()
    } else {
      failed = true
      drawer?.dispose()
    }
  } catch (error) {
    fail(error)
  }
}
