import type { AnyCircuitElement } from "circuit-json"

/** Exercise the real viewer and worker with an opaque copper plane in CI. */
export class CircuitToWebGpuDrawer {
  stats = { geometryUploads: 0, frames: 0, compileMs: 0 }
  diagnostics: Array<{ type: string; message: string }> = []

  constructor(private canvas: OffscreenCanvas) {}

  static async create(canvas: OffscreenCanvas) {
    return new CircuitToWebGpuDrawer(canvas)
  }

  setCircuitJson(elements: AnyCircuitElement[]) {
    this.stats.geometryUploads++
    if (
      elements.some(({ type }) => type === "pcb_differential_pair_local_skew")
    ) {
      this.diagnostics = [
        {
          type: "pcb_differential_pair_local_skew",
          message: "Local skew reached the GPU geometry",
        },
      ]
    }
  }

  render() {
    const context = this.canvas.getContext("2d")!
    context.fillStyle = "rgb(200, 52, 52)"
    context.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.stats.frames++
  }

  dispose() {}
}
