import type { AnyCircuitElement } from "circuit-json"

let pendingFrame: FrameRequestCallback | undefined

Object.defineProperty(self, "requestAnimationFrame", {
  value: (callback: FrameRequestCallback) => {
    pendingFrame = callback
    return 1
  },
})

self.addEventListener("message", (event: MessageEvent<{ type: string }>) => {
  if (event.data.type !== "test_render_frame") return
  event.stopImmediatePropagation()
  const frame = pendingFrame
  pendingFrame = undefined
  frame?.(performance.now())
  self.postMessage({ type: "test_frame_flushed" })
})

// Exercise the real worker scheduler without requiring a GPU adapter in CI.
export class CircuitToWebGpuDrawer {
  static supportsXRayNet = true
  diagnostics: Array<{ type: string; message: string }> = []
  stats = { geometryUploads: 0, frames: 0, compileMs: 0 }

  static async create() {
    return new CircuitToWebGpuDrawer()
  }

  setCircuitJson(elements: AnyCircuitElement[]) {
    this.stats.geometryUploads++
    self.postMessage({
      type: "test_scene_compiled",
      elementCount: elements.length,
    })
  }

  render() {
    this.stats.frames++
  }

  dispose() {}
}
