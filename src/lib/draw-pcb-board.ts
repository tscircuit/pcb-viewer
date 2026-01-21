import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"

export function isPcbBoardElement(element: AnyCircuitElement) {
  return element.type === "pcb_board" || element.type === "pcb_panel"
}

export function drawPcbBoardElements({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  drawSoldermask,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  drawSoldermask?: boolean
}) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  const pcbBoardElements = elements.filter(isPcbBoardElement)

  for (const element of pcbBoardElements) {
    drawer.drawElements([element], { layers, drawSoldermask })
  }
}
