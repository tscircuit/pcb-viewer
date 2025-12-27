import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import type { Matrix } from "transformation-matrix"

export function isPlatedHole(element: AnyCircuitElement) {
  return element.type === "pcb_plated_hole"
}

export function drawPlatedHolePads(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layers: PcbRenderLayer[],
  realToCanvasMat: Matrix,
) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  const platedHoleElements = elements.filter(isPlatedHole)

  drawer.drawElements(platedHoleElements, { layers })
}
