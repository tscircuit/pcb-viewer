import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"

export function drawPcbDebugObjects({
  canvas,
  elements,
  realToCanvasMat,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  realToCanvasMat: Matrix
}) {
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.realToCanvasMat = realToCanvasMat
  drawer.drawElements(
    elements.filter((element) => element.type === "pcb_debug_object"),
    // Remove the cast when the circuit-to-canvas release containing
    // showDebugObjects is installed.
    { layers: [], showDebugObjects: true } as Parameters<
      typeof drawer.drawElements
    >[1],
  )
}
