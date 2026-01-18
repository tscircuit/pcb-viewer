import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"

export function isPcbHole(element: AnyCircuitElement) {
  return element.type === "pcb_hole"
}

export function drawPcbHoleElementsForLayer(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layers: PcbRenderLayer[],
  realToCanvasMat: Matrix,
  drawSoldermask?: boolean,
) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  const holeElements = elements.filter(isPcbHole)

  drawer.drawElements(holeElements, { layers, drawSoldermask })
}
