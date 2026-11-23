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
  private elementCount = 0

  static async create() {
    return new CircuitToWebGpuDrawer()
  }

  setCircuitJson(elements: AnyCircuitElement[]) {
    this.stats.geometryUploads++
    this.elementCount = elements.length
    self.postMessage({
      type: "test_scene_compiled",
      elementCount: elements.length,
    })
  }

  render(options: { layerStrokes?: readonly unknown[] }) {
    this.stats.frames++
    self.postMessage({
      type: "test_frame_drawn",
      elementCount: this.elementCount,
      layerStrokeCount: options.layerStrokes?.length ?? 0,
    })
  }

  dispose() {}
}
