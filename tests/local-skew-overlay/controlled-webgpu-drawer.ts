import type { AnyCircuitElement } from "circuit-json"

/** Exercise the production viewer and worker without a GPU adapter in CI. */
export class CircuitToWebGpuDrawer {
  stats = { geometryUploads: 0, frames: 0, compileMs: 0 }
  diagnostics: Array<{ type: string; message: string }> = []

  static async create() {
    return new CircuitToWebGpuDrawer()
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
    this.stats.frames++
  }

  dispose() {}
}
